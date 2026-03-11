import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { TLSSocket } from "node:tls";

import WebSocket, { type RawData } from "ws";

import {
  buildDeviceAuthPayloadV3,
  loadOrCreateGatewayIdentity,
  publicKeyRawBase64UrlFromPem,
  signDevicePayload
} from "./device-auth.js";
import type {
  GatewayClientOptions,
  GatewayConnectChallengePayload,
  GatewayDeviceIdentity,
  GatewayEventFrame,
  GatewayHelloOk,
  GatewayRequestFrame,
  GatewayResponseFrame
} from "./types.js";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }
  return Buffer.from(data).toString("utf8");
}

function normalizeFingerprint(input?: string): string {
  return (input ?? "")
    .trim()
    .replace(/^sha-?256\s*:?\s*/i, "")
    .replace(/[^a-fA-F0-9]/g, "")
    .toLowerCase();
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export class GatewayClient extends EventEmitter {
  private readonly options: GatewayClientOptions;
  private readonly deviceIdentity: GatewayDeviceIdentity;
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private connectNonce: string | null = null;
  private connectSent = false;
  private connectTimeout: NodeJS.Timeout | null = null;
  private helloOk: GatewayHelloOk | null = null;
  private connectPromise: Promise<GatewayHelloOk> | null = null;
  private connectResolve: ((value: GatewayHelloOk) => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;
  private closed = false;

  constructor(options: GatewayClientOptions) {
    super();
    this.options = options;
    this.deviceIdentity = loadOrCreateGatewayIdentity(options.deviceIdentityPath);
  }

  async connect(): Promise<GatewayHelloOk> {
    if (this.helloOk) {
      return this.helloOk;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.closed = false;
    this.connectPromise = new Promise<GatewayHelloOk>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
    });

    const wsOptions: WebSocket.ClientOptions = {
      maxPayload: 25 * 1024 * 1024
    };

    if (this.options.url.startsWith("wss://") && this.options.tlsFingerprint) {
      wsOptions.rejectUnauthorized = false;
    }

    this.ws = new WebSocket(this.options.url, wsOptions);
    this.ws.on("open", () => {
      const tlsError = this.validateTlsFingerprint();
      if (tlsError) {
        this.failConnect(tlsError);
        this.ws?.close(1008, tlsError.message);
        return;
      }
      this.queueConnectTimeout();
    });
    this.ws.on("message", (data: RawData) => {
      this.handleMessage(rawDataToString(data));
    });
    this.ws.on("close", (code: number, reason: Buffer) => {
      const reasonText = rawDataToString(reason);
      this.ws = null;
      const error = new Error(`gateway closed (${code}): ${reasonText}`);
      this.flushPending(error);
      if (!this.helloOk) {
        this.failConnect(error);
      }
      this.emit("close", {
        code,
        reason: reasonText
      });
    });
    this.ws.on("error", (error: Error) => {
      const normalized = toError(error);
      if (!this.helloOk) {
        this.failConnect(normalized);
      }
      this.emit("error", normalized);
    });

    return this.connectPromise;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.clearConnectTimeout();
    const ws = this.ws;
    this.ws = null;
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
    this.helloOk = null;
    this.connectSent = false;
    this.connectNonce = null;
    this.flushPending(new Error("gateway client closed"));
    if (!ws) {
      return;
    }

    await new Promise<void>((resolve) => {
      ws.once("close", () => resolve());
      ws.close();
    });
  }

  async request<TResponse>(method: string, params?: unknown): Promise<TResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }

    const id = randomUUID();
    const frame: GatewayRequestFrame = {
      type: "req",
      id,
      method,
      params
    };

    const response = new Promise<TResponse>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as TResponse),
        reject
      });
    });

    this.ws.send(JSON.stringify(frame));
    return response;
  }

  private queueConnectTimeout(): void {
    this.clearConnectTimeout();
    this.connectTimeout = setTimeout(() => {
      if (this.connectSent || this.closed) {
        return;
      }
      const error = new Error("gateway connect challenge timeout");
      this.failConnect(error);
      this.ws?.close(1008, error.message);
    }, this.options.connectTimeoutMs ?? 2_000);
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  private handleMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.emit("error", toError(error));
      return;
    }

    if (this.isEventFrame(parsed)) {
      if (parsed.event === "connect.challenge") {
        const nonce = parsed.payload?.nonce?.trim();
        if (!nonce) {
          const error = new Error("gateway connect challenge missing nonce");
          this.failConnect(error);
          this.ws?.close(1008, error.message);
          return;
        }
        this.connectNonce = nonce;
        void this.sendConnect();
        return;
      }

      this.emit("event", parsed);
      return;
    }

    if (this.isResponseFrame(parsed)) {
      const pending = this.pending.get(parsed.id);
      if (!pending) {
        return;
      }
      this.pending.delete(parsed.id);
      if (parsed.ok) {
        pending.resolve(parsed.payload);
      } else {
        pending.reject(new Error(parsed.error?.message ?? "gateway request failed"));
      }
    }
  }

  private async sendConnect(): Promise<void> {
    if (this.connectSent) {
      return;
    }
    const nonce = this.connectNonce?.trim() ?? "";
    if (!nonce) {
      throw new Error("gateway connect challenge missing nonce");
    }

    this.connectSent = true;
    this.clearConnectTimeout();

    const signedAt = Date.now();
    const role = this.options.role ?? "operator";
    const authToken = this.options.token ?? this.options.deviceToken;
    const auth =
      this.options.token || this.options.password || this.options.deviceToken
        ? {
            token: authToken,
            password: this.options.password,
            deviceToken: this.options.deviceToken
          }
        : undefined;

    const payload = buildDeviceAuthPayloadV3({
      deviceId: this.deviceIdentity.deviceId,
      clientId: this.options.clientId,
      clientMode: this.options.clientMode,
      role,
      scopes: this.options.scopes,
      signedAtMs: signedAt,
      token: authToken ?? null,
      nonce,
      platform: this.options.platform,
      deviceFamily: this.options.deviceFamily
    });

    const hello = await this.request<GatewayHelloOk>("connect", {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: this.options.clientId,
        version: this.options.clientVersion,
        platform: this.options.platform ?? process.platform,
        mode: this.options.clientMode,
        deviceFamily: this.options.deviceFamily,
        instanceId: this.options.instanceId
      },
      role,
      scopes: this.options.scopes,
      caps: [],
      commands: [],
      permissions: {},
      auth,
      device: {
        id: this.deviceIdentity.deviceId,
        publicKey: publicKeyRawBase64UrlFromPem(this.deviceIdentity.publicKeyPem),
        signature: signDevicePayload(this.deviceIdentity.privateKeyPem, payload),
        signedAt,
        nonce
      }
    });

    this.helloOk = hello;
    this.connectResolve?.(hello);
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
    this.emit("hello", hello);
  }

  private failConnect(error: Error): void {
    this.clearConnectTimeout();
    if (this.connectReject) {
      this.connectReject(error);
    }
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
  }

  private flushPending(error: Error): void {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private validateTlsFingerprint(): Error | null {
    if (!this.options.tlsFingerprint || !this.ws) {
      return null;
    }

    const socket = (this.ws as unknown as { _socket?: TLSSocket })._socket;
    const expected = normalizeFingerprint(this.options.tlsFingerprint);
    const actual = normalizeFingerprint(socket?.getPeerCertificate?.().fingerprint256);

    if (!expected) {
      return new Error("gateway tls fingerprint missing");
    }
    if (!actual) {
      return new Error("gateway tls fingerprint unavailable");
    }
    if (actual !== expected) {
      return new Error("gateway tls fingerprint mismatch");
    }
    return null;
  }

  private isEventFrame(value: unknown): value is GatewayEventFrame<GatewayConnectChallengePayload> {
    return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      "event" in value &&
      (value as { type?: string }).type === "event" &&
      typeof (value as { event?: string }).event === "string"
    );
  }

  private isResponseFrame(value: unknown): value is GatewayResponseFrame {
    return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      "id" in value &&
      "ok" in value &&
      (value as { type?: string }).type === "res" &&
      typeof (value as { id?: string }).id === "string" &&
      typeof (value as { ok?: boolean }).ok === "boolean"
    );
  }
}

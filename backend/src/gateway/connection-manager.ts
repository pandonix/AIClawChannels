import { EventEmitter } from "node:events";

import { GatewayClient } from "./client.js";
import { loadGatewayDeviceToken, saveGatewayDeviceToken } from "./device-token-store.js";
import {
  loadGatewayConnectionState,
  saveGatewayConnectionState
} from "./state-store.js";
import type {
  GatewayClientOptions,
  GatewayConnectionManagerOptions,
  GatewayConnectionState,
  GatewayDeviceTokenSource,
  GatewayDisconnectInfo,
  GatewayEventFrame,
  GatewayHelloOk
} from "./types.js";

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export class GatewayConnectionManager extends EventEmitter {
  private readonly options: GatewayConnectionManagerOptions;
  private readonly reconnectInitialDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private client: GatewayClient | null = null;
  private connectPromise: Promise<GatewayHelloOk> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs: number;
  private closed = false;
  private state: GatewayConnectionState;
  private connectAttempt = 0;
  private activeDeviceToken: string | undefined;
  private deviceTokenSource: GatewayDeviceTokenSource;

  constructor(options: GatewayConnectionManagerOptions) {
    super();
    this.options = options;
    this.reconnectInitialDelayMs = Math.max(50, options.reconnectInitialDelayMs ?? 500);
    this.reconnectMaxDelayMs = Math.max(
      this.reconnectInitialDelayMs,
      options.reconnectMaxDelayMs ?? 10_000
    );
    this.reconnectDelayMs = this.reconnectInitialDelayMs;
    this.activeDeviceToken =
      options.deviceToken?.trim() || loadGatewayDeviceToken(options.deviceTokenCachePath);
    const persistedState = loadGatewayConnectionState(options.stateCachePath);
    this.deviceTokenSource = options.deviceToken?.trim()
      ? "config"
      : this.activeDeviceToken
        ? "cache"
        : "none";
    this.state = {
      phase: "idle",
      connected: false,
      attempt: 0,
      updatedAtMs: Date.now(),
      deviceTokenSource: this.deviceTokenSource,
      lastConnectedAtMs: persistedState?.lastConnectedAtMs,
      lastHello: persistedState?.lastHello,
      lastError: persistedState?.lastError
    };
  }

  getState(): GatewayConnectionState {
    return {
      ...this.state
    };
  }

  async connect(): Promise<GatewayHelloOk> {
    if (this.closed) {
      throw new Error("gateway connection manager closed");
    }
    if (this.state.phase === "connected" && this.client) {
      return this.client.connect();
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.clearReconnectTimer();
    this.connectAttempt += 1;
    this.setState({
      phase: this.state.phase === "reconnecting" ? "reconnecting" : "connecting",
      connected: false,
      attempt: this.connectAttempt,
      nextRetryDelayMs: undefined,
      lastError: undefined
    });

    const client = new GatewayClient(this.buildClientOptions());
    this.client = client;
    this.bindClient(client);

    this.connectPromise = client
      .connect()
      .then((hello) => {
        this.connectPromise = null;
        this.reconnectDelayMs = this.reconnectInitialDelayMs;
        this.persistDeviceToken(hello.auth?.deviceToken);
        this.persistConnectionState({
          lastConnectedAtMs: Date.now(),
          lastHello: hello,
          lastError: undefined
        });
        this.setState({
          phase: "connected",
          connected: true,
          attempt: this.connectAttempt,
          lastConnectedAtMs: this.state.lastConnectedAtMs,
          lastHello: hello,
          nextRetryDelayMs: undefined,
          lastError: undefined
        });
        this.emit("hello", hello);
        return hello;
      })
      .catch((error) => {
        this.connectPromise = null;
        const normalized = toError(error);
        this.handleDisconnect(client, normalized);
        throw normalized;
      });

    return this.connectPromise;
  }

  async request<TResponse>(method: string, params?: unknown): Promise<TResponse> {
    const client = await this.waitForReadyClient();
    return client.request<TResponse>(method, params);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.clearReconnectTimer();
    this.setState({
      phase: "closed",
      connected: false,
      nextRetryDelayMs: undefined
    });

    const client = this.client;
    this.client = null;
    this.connectPromise = null;

    if (client) {
      await client.close();
    }
  }

  private bindClient(client: GatewayClient): void {
    client.on("event", (event: GatewayEventFrame) => {
      if (client !== this.client) {
        return;
      }
      this.emit("event", event);
    });
    client.on("close", (info: GatewayDisconnectInfo) => {
      this.handleDisconnect(client, new Error(`gateway closed (${info.code}): ${info.reason}`), info);
    });
    client.on("error", (error: Error) => {
      if (client !== this.client) {
        return;
      }
      this.emitError(toError(error));
    });
  }

  private handleDisconnect(
    client: GatewayClient,
    error: Error,
    info?: GatewayDisconnectInfo
  ): void {
    if (client !== this.client) {
      return;
    }

    this.client = null;
    this.connectPromise = null;
    this.emit("disconnect", {
      code: info?.code ?? 1006,
      reason: info?.reason ?? error.message
    } satisfies GatewayDisconnectInfo);
    this.persistConnectionState({
      lastConnectedAtMs: this.state.lastConnectedAtMs,
      lastHello: this.state.lastHello,
      lastError: error.message
    });

    if (this.closed || this.options.reconnectEnabled === false) {
      this.setState({
        phase: this.closed ? "closed" : "idle",
        connected: false,
        nextRetryDelayMs: undefined,
        lastError: error.message
      });
      return;
    }

    this.scheduleReconnect(error);
  }

  private scheduleReconnect(error: Error): void {
    if (this.closed || this.reconnectTimer) {
      return;
    }

    const delayMs = this.reconnectDelayMs;
    this.setState({
      phase: "reconnecting",
      connected: false,
      nextRetryDelayMs: delayMs,
      lastError: error.message
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch((connectError) => {
        this.emitError(toError(connectError));
      });
    }, delayMs);
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.reconnectMaxDelayMs);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private buildClientOptions(): GatewayClientOptions {
    return {
      ...this.options,
      deviceToken: this.activeDeviceToken
    };
  }

  private persistDeviceToken(deviceToken?: string): void {
    const normalized = deviceToken?.trim();
    if (!normalized) {
      return;
    }

    this.activeDeviceToken = normalized;
    this.deviceTokenSource =
      this.options.deviceToken?.trim() === normalized ? "config" : "cache";
    if (this.deviceTokenSource === "cache") {
      saveGatewayDeviceToken(normalized, this.options.deviceTokenCachePath);
    }
  }

  private persistConnectionState(
    next: Pick<GatewayConnectionState, "lastConnectedAtMs" | "lastHello" | "lastError">
  ): void {
    const persisted = saveGatewayConnectionState(
      {
        version: 1,
        lastConnectedAtMs: next.lastConnectedAtMs,
        lastHello: next.lastHello,
        lastError: next.lastError
      },
      this.options.stateCachePath
    );
    this.state.lastConnectedAtMs = persisted.lastConnectedAtMs;
    this.state.lastHello = persisted.lastHello;
    this.state.lastError = persisted.lastError;
  }

  private setState(next: Partial<GatewayConnectionState>): void {
    this.state = {
      ...this.state,
      ...next,
      deviceTokenSource: this.deviceTokenSource,
      updatedAtMs: Date.now()
    };
    this.emit("state", this.getState());
  }

  private async waitForReadyClient(): Promise<GatewayClient> {
    let lastError: Error | null = null;

    while (!this.closed) {
      if (this.state.phase === "connected" && this.client) {
        return this.client;
      }

      try {
        await this.connect();
      } catch (error) {
        lastError = toError(error);
        if (this.options.reconnectEnabled === false) {
          throw lastError;
        }
      }

      if (this.state.phase === "connected" && this.client) {
        return this.client;
      }

      await this.waitForStateChange();
    }

    throw lastError ?? new Error("gateway connection manager closed");
  }

  private waitForStateChange(): Promise<void> {
    return new Promise((resolve) => {
      const handleState = (): void => {
        cleanup();
        resolve();
      };
      const handleClosed = (): void => {
        cleanup();
        resolve();
      };
      const cleanup = (): void => {
        this.off("state", handleState);
        this.off("disconnect", handleClosed);
      };

      this.once("state", handleState);
      this.once("disconnect", handleClosed);
    });
  }

  private emitError(error: Error): void {
    if (this.listenerCount("error") > 0) {
      this.emit("error", error);
    }
  }
}

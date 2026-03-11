import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { GatewayDeviceIdentity } from "./types.js";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const DEFAULT_IDENTITY_PATH = fileURLToPath(
  new URL("../../.state/gateway-device-identity.json", import.meta.url)
);

interface StoredGatewayDeviceIdentity extends GatewayDeviceIdentity {
  version: 1;
  createdAtMs: number;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const spki = createPublicKey(publicKeyPem).export({
    type: "spki",
    format: "der"
  });

  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }

  return spki;
}

function ensureDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), {
    recursive: true
  });
}

function fingerprintPublicKey(publicKeyPem: string): string {
  return createHash("sha256").update(derivePublicKeyRaw(publicKeyPem)).digest("hex");
}

function createIdentity(): GatewayDeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem"
  }).toString();
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem"
  }).toString();

  return {
    deviceId: fingerprintPublicKey(publicKeyPem),
    publicKeyPem,
    privateKeyPem
  };
}

function writeIdentity(filePath: string, identity: GatewayDeviceIdentity): GatewayDeviceIdentity {
  const payload: StoredGatewayDeviceIdentity = {
    version: 1,
    ...identity,
    createdAtMs: Date.now()
  };

  ensureDir(filePath);
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, {
    mode: 0o600
  });
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // Best effort only.
  }
  return identity;
}

export function resolveGatewayIdentityPath(input?: string): string {
  return input?.trim() ? path.resolve(input) : DEFAULT_IDENTITY_PATH;
}

export function loadOrCreateGatewayIdentity(inputPath?: string): GatewayDeviceIdentity {
  const filePath = resolveGatewayIdentityPath(inputPath);
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredGatewayDeviceIdentity>;
    if (
      parsed.version === 1 &&
      typeof parsed.deviceId === "string" &&
      typeof parsed.publicKeyPem === "string" &&
      typeof parsed.privateKeyPem === "string"
    ) {
      const derivedDeviceId = fingerprintPublicKey(parsed.publicKeyPem);
      const identity: GatewayDeviceIdentity = {
        deviceId: derivedDeviceId,
        publicKeyPem: parsed.publicKeyPem,
        privateKeyPem: parsed.privateKeyPem
      };

      if (derivedDeviceId !== parsed.deviceId) {
        return writeIdentity(filePath, identity);
      }

      return identity;
    }
  }

  return writeIdentity(filePath, createIdentity());
}

function normalizeDeviceMetadata(value?: string): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildDeviceAuthPayloadV3(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
  platform?: string | undefined;
  deviceFamily?: string | undefined;
}): string {
  return [
    "v3",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce,
    normalizeDeviceMetadata(params.platform),
    normalizeDeviceMetadata(params.deviceFamily)
  ].join("|");
}

export function signDevicePayload(privateKeyPem: string, payload: string): string {
  const privateKey = createPrivateKey(privateKeyPem);
  return base64UrlEncode(sign(null, Buffer.from(payload, "utf8"), privateKey));
}

export function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

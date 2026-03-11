import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DEVICE_TOKEN_PATH = fileURLToPath(
  new URL("../../.state/gateway-device-token.json", import.meta.url)
);

interface StoredGatewayDeviceToken {
  version: 1;
  deviceToken: string;
  updatedAtMs: number;
}

function ensureDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), {
    recursive: true
  });
}

export function resolveGatewayDeviceTokenPath(input?: string): string {
  return input?.trim() ? path.resolve(input) : DEFAULT_DEVICE_TOKEN_PATH;
}

export function loadGatewayDeviceToken(inputPath?: string): string | undefined {
  const filePath = resolveGatewayDeviceTokenPath(inputPath);
  if (!existsSync(filePath)) {
    return undefined;
  }

  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<StoredGatewayDeviceToken>;
  if (parsed.version !== 1 || typeof parsed.deviceToken !== "string") {
    return undefined;
  }

  const deviceToken = parsed.deviceToken.trim();
  return deviceToken || undefined;
}

export function saveGatewayDeviceToken(deviceToken: string, inputPath?: string): string {
  const normalized = deviceToken.trim();
  if (!normalized) {
    throw new Error("gateway device token cannot be empty");
  }

  const filePath = resolveGatewayDeviceTokenPath(inputPath);
  const payload: StoredGatewayDeviceToken = {
    version: 1,
    deviceToken: normalized,
    updatedAtMs: Date.now()
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

  return normalized;
}

export function clearGatewayDeviceToken(inputPath?: string): void {
  const filePath = resolveGatewayDeviceTokenPath(inputPath);
  if (!existsSync(filePath)) {
    return;
  }

  rmSync(filePath);
}

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PersistedGatewayConnectionState } from "./types.js";

const DEFAULT_GATEWAY_STATE_PATH = fileURLToPath(
  new URL("../../.state/gateway-connection-state.json", import.meta.url)
);

function ensureDir(filePath: string): void {
  mkdirSync(path.dirname(filePath), {
    recursive: true
  });
}

export function resolveGatewayStatePath(input?: string): string {
  return input?.trim() ? path.resolve(input) : DEFAULT_GATEWAY_STATE_PATH;
}

export function loadGatewayConnectionState(
  inputPath?: string
): PersistedGatewayConnectionState | undefined {
  const filePath = resolveGatewayStatePath(inputPath);
  if (!existsSync(filePath)) {
    return undefined;
  }

  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<PersistedGatewayConnectionState>;
  if (parsed.version !== 1) {
    return undefined;
  }

  return {
    version: 1,
    lastConnectedAtMs:
      typeof parsed.lastConnectedAtMs === "number" ? parsed.lastConnectedAtMs : undefined,
    lastHello:
      parsed.lastHello && typeof parsed.lastHello === "object" ? parsed.lastHello : undefined,
    lastError: typeof parsed.lastError === "string" ? parsed.lastError : undefined
  };
}

export function saveGatewayConnectionState(
  state: PersistedGatewayConnectionState,
  inputPath?: string
): PersistedGatewayConnectionState {
  const filePath = resolveGatewayStatePath(inputPath);
  const payload: PersistedGatewayConnectionState = {
    version: 1,
    lastConnectedAtMs: state.lastConnectedAtMs,
    lastHello: state.lastHello,
    lastError: state.lastError
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

  return payload;
}

import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { AddressInfo } from "node:net";

import { WebSocketServer, type WebSocket } from "ws";

import { GatewayConnectionManager } from "./connection-manager.js";

interface MockGatewayServer {
  authFrames: Array<Record<string, unknown> | undefined>;
  connectionCount: number;
  url: string;
  close: () => Promise<void>;
}

async function createMockGatewayServer(options?: {
  issuedDeviceToken?: string;
  closeFirstConnection?: boolean;
}): Promise<MockGatewayServer> {
  const wss = new WebSocketServer({
    port: 0
  });
  const sockets = new Set<WebSocket>();
  const authFrames: Array<Record<string, unknown> | undefined> = [];
  let connectionCount = 0;

  wss.on("connection", (socket) => {
    sockets.add(socket);
    connectionCount += 1;
    const currentConnection = connectionCount;

    socket.send(
      JSON.stringify({
        type: "event",
        event: "connect.challenge",
        payload: {
          nonce: `nonce-${currentConnection}`
        }
      })
    );

    socket.on("message", (raw) => {
      const frame = JSON.parse(String(raw)) as {
        id: string;
        method: string;
        params?: {
          auth?: Record<string, unknown>;
        };
      };

      if (frame.method === "connect") {
        authFrames.push(frame.params?.auth);
        socket.send(
          JSON.stringify({
            type: "res",
            id: frame.id,
            ok: true,
            payload: {
              type: "hello-ok",
              protocol: 3,
              auth: options?.issuedDeviceToken
                ? {
                    deviceToken: options.issuedDeviceToken
                  }
                : undefined
            }
          })
        );

        if (options?.closeFirstConnection && currentConnection === 1) {
          setTimeout(() => {
            socket.close(1012, "restart");
          }, 25);
        }
        return;
      }

      if (frame.method === "health") {
        socket.send(
          JSON.stringify({
            type: "res",
            id: frame.id,
            ok: true,
            payload: {
              ok: true,
              connectionCount: currentConnection
            }
          })
        );
      }
    });

    socket.on("close", () => {
      sockets.delete(socket);
    });
  });

  await once(wss, "listening");
  const { port } = wss.address() as AddressInfo;

  return {
    authFrames,
    get connectionCount() {
      return connectionCount;
    },
    url: `ws://127.0.0.1:${port}`,
    async close(): Promise<void> {
      for (const socket of sockets) {
        socket.close();
      }
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
    }
  };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2_000,
  intervalMs = 20
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`condition not met within ${timeoutMs}ms`);
}

function createPaths(prefix: string): {
  deviceIdentityPath: string;
  deviceTokenCachePath: string;
  stateCachePath: string;
} {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  return {
    deviceIdentityPath: path.join(tempDir, "gateway-identity.json"),
    deviceTokenCachePath: path.join(tempDir, "gateway-device-token.json"),
    stateCachePath: path.join(tempDir, "gateway-connection-state.json")
  };
}

test("GatewayConnectionManager caches issued device tokens for later connects", async () => {
  const server = await createMockGatewayServer({
    issuedDeviceToken: "issued-token-1"
  });
  const paths = createPaths("gateway-manager-cache-");

  const manager = new GatewayConnectionManager({
    url: server.url,
    scopes: ["operator.read"],
    clientId: "gateway-test",
    clientVersion: "0.1.0",
    clientMode: "backend",
    deviceIdentityPath: paths.deviceIdentityPath,
    deviceTokenCachePath: paths.deviceTokenCachePath,
    stateCachePath: paths.stateCachePath,
    reconnectEnabled: false,
    connectTimeoutMs: 500
  });

  try {
    await manager.connect();
    await manager.close();

    const cached = JSON.parse(readFileSync(paths.deviceTokenCachePath, "utf8")) as {
      deviceToken: string;
    };
    assert.equal(cached.deviceToken, "issued-token-1");

    const managerWithCache = new GatewayConnectionManager({
      url: server.url,
      scopes: ["operator.read"],
      clientId: "gateway-test",
      clientVersion: "0.1.0",
      clientMode: "backend",
      deviceIdentityPath: paths.deviceIdentityPath,
      deviceTokenCachePath: paths.deviceTokenCachePath,
      stateCachePath: paths.stateCachePath,
      reconnectEnabled: false,
      connectTimeoutMs: 500
    });

    try {
      await managerWithCache.connect();
    } finally {
      await managerWithCache.close();
    }

    assert.equal(server.authFrames.length, 2);
    assert.equal(server.authFrames[0]?.deviceToken, undefined);
    assert.equal(server.authFrames[1]?.deviceToken, "issued-token-1");
  } finally {
    await server.close();
  }
});

test("GatewayConnectionManager reconnects and keeps requests available", async () => {
  const server = await createMockGatewayServer({
    issuedDeviceToken: "issued-token-2",
    closeFirstConnection: true
  });
  const paths = createPaths("gateway-manager-reconnect-");
  const states: string[] = [];

  const manager = new GatewayConnectionManager({
    url: server.url,
    scopes: ["operator.read"],
    clientId: "gateway-test",
    clientVersion: "0.1.0",
    clientMode: "backend",
    deviceIdentityPath: paths.deviceIdentityPath,
    deviceTokenCachePath: paths.deviceTokenCachePath,
    stateCachePath: paths.stateCachePath,
    reconnectEnabled: true,
    reconnectInitialDelayMs: 25,
    reconnectMaxDelayMs: 100,
    connectTimeoutMs: 500
  });

  manager.on("state", (state) => {
    states.push(state.phase);
  });

  try {
    await manager.connect();
    await waitFor(() => server.connectionCount >= 2 && manager.getState().phase === "connected");

    const health = await manager.request<{ ok: boolean; connectionCount: number }>("health", {});
    assert.equal(health.ok, true);
    assert.equal(health.connectionCount, 2);
    assert.equal(manager.getState().connected, true);
    assert.ok(states.includes("reconnecting"));
    assert.deepEqual(states.slice(0, 3), ["connecting", "connected", "reconnecting"]);
  } finally {
    await manager.close();
    await server.close();
  }
});

test("GatewayConnectionManager restores last successful connection snapshot on restart", async () => {
  const server = await createMockGatewayServer({
    issuedDeviceToken: "issued-token-3"
  });
  const paths = createPaths("gateway-manager-state-");

  const firstManager = new GatewayConnectionManager({
    url: server.url,
    scopes: ["operator.read"],
    clientId: "gateway-test",
    clientVersion: "0.1.0",
    clientMode: "backend",
    deviceIdentityPath: paths.deviceIdentityPath,
    deviceTokenCachePath: paths.deviceTokenCachePath,
    stateCachePath: paths.stateCachePath,
    reconnectEnabled: false,
    connectTimeoutMs: 500
  });

  try {
    const hello = await firstManager.connect();
    const firstState = firstManager.getState();
    assert.equal(firstState.connected, true);
    assert.equal(firstState.lastHello?.protocol, hello.protocol);
    assert.equal(typeof firstState.lastConnectedAtMs, "number");
  } finally {
    await firstManager.close();
  }

  const reloadedManager = new GatewayConnectionManager({
    url: server.url,
    scopes: ["operator.read"],
    clientId: "gateway-test",
    clientVersion: "0.1.0",
    clientMode: "backend",
    deviceIdentityPath: paths.deviceIdentityPath,
    deviceTokenCachePath: paths.deviceTokenCachePath,
    stateCachePath: paths.stateCachePath,
    reconnectEnabled: false,
    connectTimeoutMs: 500
  });

  try {
    const restoredState = reloadedManager.getState();
    assert.equal(restoredState.connected, false);
    assert.equal(restoredState.phase, "idle");
    assert.equal(restoredState.lastHello?.protocol, 3);
    assert.equal(typeof restoredState.lastConnectedAtMs, "number");
    assert.equal(restoredState.deviceTokenSource, "cache");
  } finally {
    await reloadedManager.close();
    await server.close();
  }
});

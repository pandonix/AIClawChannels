import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });
import Fastify from "fastify";
import cors from "@fastify/cors";

import { ChatService } from "./chat/chat-service.js";
import { loadEnv } from "./config/env.js";
import { EventBus } from "./event-bus/event-bus.js";
import { GatewayEventSource } from "./event-bus/gateway-event-source.js";
import { MockGatewayEventSource } from "./event-bus/mock-event-source.js";
import { GatewayConnectionManager } from "./gateway/connection-manager.js";
import { buildMockGateway } from "./mock/mock-gateway.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerDevRoutes } from "./routes/dev.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerStreamRoutes } from "./routes/stream.js";
import { GatewayRuntime } from "./runtime/gateway-runtime.js";
import { MockRuntime } from "./runtime/mock-runtime.js";
import { SessionService } from "./sessions/session-service.js";

async function start(): Promise<void> {
  const env = loadEnv();
  const app = Fastify({
    logger: true
  });
  const gatewayManager = env.mockGateway
    ? undefined
    : new GatewayConnectionManager({
        url: env.gatewayWsUrl,
        token: env.gatewayOperatorToken,
        password: env.gatewayOperatorPassword,
        deviceToken: env.gatewayDeviceToken,
        tlsFingerprint: env.gatewayTlsFingerprint,
        scopes: env.gatewayScopes,
        clientId: "gateway-client",
        clientVersion: "0.1.0",
        clientMode: "backend",
        platform: process.platform,
        deviceIdentityPath: env.gatewayDeviceIdentityPath
      });
  const mockGateway = env.mockGateway ? buildMockGateway() : undefined;
  const runtime = mockGateway ? new MockRuntime(mockGateway) : new GatewayRuntime(gatewayManager!);
  const sessionService = new SessionService({
    runtime
  });
  const chatService = new ChatService({
    runtime,
    sessionService
  });
  const eventBus = new EventBus({
    sessionService,
    eventSource: mockGateway
      ? new MockGatewayEventSource(mockGateway)
      : new GatewayEventSource(gatewayManager!)
  });

  if (gatewayManager) {
    await gatewayManager.connect();
  }
  await sessionService.hydrate();

  await app.register(cors, {
    origin: true
  });

  app.get("/health", async () => ({
    ok: true,
    mode: env.mockGateway ? "mock" : "gateway",
    gatewayWsUrl: env.gatewayWsUrl
  }));

  await registerSessionRoutes(app, { sessionService });
  await registerChatRoutes(app, { chatService });
  await registerStreamRoutes(app, { eventBus, sessionService });

  if (env.nodeEnv !== "production") {
    await registerDevRoutes(app, { eventBus });
  }

  await app.listen({
    host: "0.0.0.0",
    port: env.port
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

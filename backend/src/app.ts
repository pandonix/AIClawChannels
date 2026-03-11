import Fastify from "fastify";
import cors from "@fastify/cors";

import { ChatService } from "./chat/chat-service.js";
import { loadEnv } from "./config/env.js";
import { buildMockGateway } from "./mock/mock-gateway.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerStreamRoutes } from "./routes/stream.js";
import { MockRuntime } from "./runtime/mock-runtime.js";
import { SessionService } from "./sessions/session-service.js";

async function start(): Promise<void> {
  const env = loadEnv();
  const app = Fastify({
    logger: true
  });
  const mockGateway = buildMockGateway();
  const runtime = new MockRuntime(mockGateway);
  const sessionService = new SessionService({
    runtime
  });
  const chatService = new ChatService({
    runtime,
    sessionService
  });

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
  await registerStreamRoutes(app, { mockGateway });

  await app.listen({
    host: "0.0.0.0",
    port: env.port
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

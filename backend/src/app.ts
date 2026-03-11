import Fastify from "fastify";
import cors from "@fastify/cors";

import { loadEnv } from "./config/env.js";
import { buildMockGateway } from "./mock/mock-gateway.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerStreamRoutes } from "./routes/stream.js";

async function start(): Promise<void> {
  const env = loadEnv();
  const app = Fastify({
    logger: true
  });
  const mockGateway = buildMockGateway();

  await app.register(cors, {
    origin: true
  });

  app.get("/health", async () => ({
    ok: true,
    mode: env.mockGateway ? "mock" : "gateway",
    gatewayWsUrl: env.gatewayWsUrl
  }));

  await registerSessionRoutes(app, { mockGateway });
  await registerChatRoutes(app, { mockGateway });
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


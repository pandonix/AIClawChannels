import type { FastifyInstance } from "fastify";

import { EventBus } from "../event-bus/event-bus.js";

interface DevRouteDeps {
  eventBus: EventBus;
}

export async function registerDevRoutes(
  app: FastifyInstance,
  deps: DevRouteDeps
): Promise<void> {
  app.post<{ Body: { sessionId?: string } }>("/dev/sse-disconnect", async (request, reply) => {
    const { sessionId } = request.body ?? {};
    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }
    deps.eventBus.disconnectSession(sessionId);
    return { ok: true };
  });
}

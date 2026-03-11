import type { FastifyInstance } from "fastify";

import type { AnySseEvent } from "@contracts";

import { EventBus } from "../event-bus/event-bus.js";
import { SessionService } from "../sessions/session-service.js";

interface StreamRouteDeps {
  eventBus: EventBus;
  sessionService: SessionService;
}

function writeEvent(response: NodeJS.WritableStream, event: AnySseEvent): void {
  response.write(`event: ${event.event}\n`);
  response.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

export async function registerStreamRoutes(
  app: FastifyInstance,
  deps: StreamRouteDeps
): Promise<void> {
  app.get<{ Querystring: { sessionId?: string } }>("/api/chat/stream", async (request, reply) => {
    if (!request.query.sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }

    try {
      await deps.sessionService.getSessionRecord(request.query.sessionId);
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }

    const origin = request.headers.origin;
    if (origin) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
    }
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders?.();

    reply.raw.write(": connected\n\n");
    const unsubscribe = await deps.eventBus.subscribe(
      request.query.sessionId,
      (event) => { writeEvent(reply.raw, event); },
      () => { reply.raw.destroy(); }
    );
    const heartbeat = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return reply;
  });
}

import type { FastifyInstance } from "fastify";

import type {
  CreateSessionRequest,
  ListSessionsResponse,
  PatchSessionRequest
} from "@contracts";

import { SessionService } from "../sessions/session-service.js";

interface SessionRouteDeps {
  sessionService: SessionService;
}

export async function registerSessionRoutes(
  app: FastifyInstance,
  deps: SessionRouteDeps
): Promise<void> {
  app.get("/api/sessions", async () => {
    const response: ListSessionsResponse = {
      sessions: await deps.sessionService.listSessions()
    };
    return response;
  });

  app.post<{ Body: CreateSessionRequest }>("/api/sessions", async (request, reply) => {
    if (!request.body?.name?.trim()) {
      return reply.status(400).send({ error: "name is required" });
    }
    return deps.sessionService.createSession({
      name: request.body.name.trim()
    });
  });

  app.patch<{ Params: { id: string }; Body: PatchSessionRequest }>(
    "/api/sessions/:id",
    async (request, reply) => {
      try {
        return deps.sessionService.patchSession(request.params.id, request.body ?? {});
      } catch (error) {
        return reply.status(404).send({ error: (error as Error).message });
      }
    }
  );
}

import type { FastifyInstance } from "fastify";

import type {
  CreateSessionRequest,
  ListSessionsResponse,
  PatchSessionRequest,
  PatchSessionResponse
} from "@contracts";

import type { MockGateway } from "../mock/mock-gateway.js";

interface SessionRouteDeps {
  mockGateway: MockGateway;
}

export async function registerSessionRoutes(
  app: FastifyInstance,
  deps: SessionRouteDeps
): Promise<void> {
  app.get("/api/sessions", async () => {
    const response: ListSessionsResponse = {
      sessions: deps.mockGateway.listSessions()
    };
    return response;
  });

  app.post<{ Body: CreateSessionRequest }>("/api/sessions", async (request, reply) => {
    if (!request.body?.name?.trim()) {
      return reply.status(400).send({ error: "name is required" });
    }
    return deps.mockGateway.createSession({
      name: request.body.name.trim()
    });
  });

  app.patch<{ Params: { id: string }; Body: PatchSessionRequest }>(
    "/api/sessions/:id",
    async (request, reply) => {
      try {
        const response: PatchSessionResponse = deps.mockGateway.patchSession(
          request.params.id,
          request.body ?? {}
        );
        return response;
      } catch (error) {
        return reply.status(404).send({ error: (error as Error).message });
      }
    }
  );
}


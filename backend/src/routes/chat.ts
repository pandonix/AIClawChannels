import type { FastifyInstance } from "fastify";

import type {
  AbortChatRequest,
  ChatHistoryResponse,
  SendChatRequest,
  SendChatResponse
} from "@contracts";

import type { MockGateway } from "../mock/mock-gateway.js";

interface ChatRouteDeps {
  mockGateway: MockGateway;
}

export async function registerChatRoutes(
  app: FastifyInstance,
  deps: ChatRouteDeps
): Promise<void> {
  app.get<{ Querystring: { sessionId?: string } }>("/api/chat/history", async (request, reply) => {
    if (!request.query.sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }
    try {
      const response: ChatHistoryResponse = deps.mockGateway.getHistory(request.query.sessionId);
      return response;
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });

  app.post<{ Body: SendChatRequest }>("/api/chat/send", async (request, reply) => {
    const body = request.body;
    if (!body?.sessionId || !body.message?.trim() || !body.clientRequestId?.trim()) {
      return reply.status(400).send({ error: "sessionId, message and clientRequestId are required" });
    }
    try {
      const response: SendChatResponse = deps.mockGateway.sendMessage({
        sessionId: body.sessionId,
        message: body.message.trim(),
        clientRequestId: body.clientRequestId.trim()
      });
      return response;
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });

  app.post<{ Body: AbortChatRequest }>("/api/chat/abort", async (request, reply) => {
    const body = request.body;
    if (!body?.sessionId || !body.runId) {
      return reply.status(400).send({ error: "sessionId and runId are required" });
    }
    try {
      return deps.mockGateway.abortRun(body.sessionId, body.runId);
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });
}


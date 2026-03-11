import type { FastifyInstance } from "fastify";

import type {
  AbortChatRequest,
  SendChatRequest
} from "@contracts";

import { ChatService } from "../chat/chat-service.js";

interface ChatRouteDeps {
  chatService: ChatService;
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
      return deps.chatService.getHistory(request.query.sessionId);
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
      return deps.chatService.sendMessage({
        sessionId: body.sessionId,
        message: body.message.trim(),
        clientRequestId: body.clientRequestId.trim()
      });
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
      return deps.chatService.abortRun(body);
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });
}

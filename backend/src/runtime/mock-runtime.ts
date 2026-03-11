import type {
  AbortChatResponse,
  ChatHistoryResponse,
  CreateSessionRequest,
  PatchSessionRequest,
  SendChatResponse,
  SessionSummary
} from "@contracts";

import type { MockGateway } from "../mock/mock-gateway.js";
import type {
  BackendRuntime,
  RuntimeAbortChatParams,
  RuntimeChatHistoryParams,
  RuntimeSendChatParams
} from "./types.js";

export class MockRuntime implements BackendRuntime {
  constructor(private readonly mockGateway: MockGateway) {}

  async listSessions(): Promise<SessionSummary[]> {
    return this.mockGateway.listSessions();
  }

  async createSession(input: CreateSessionRequest): Promise<SessionSummary> {
    return this.mockGateway.createSession(input);
  }

  async patchSession(sessionId: string, input: PatchSessionRequest): Promise<SessionSummary> {
    return this.mockGateway.patchSession(sessionId, input);
  }

  async getHistory(params: RuntimeChatHistoryParams): Promise<ChatHistoryResponse> {
    return this.mockGateway.getHistory(params.sessionId);
  }

  async sendMessage(params: RuntimeSendChatParams): Promise<SendChatResponse> {
    return this.mockGateway.sendMessage({
      sessionId: params.sessionId,
      message: params.message,
      clientRequestId: params.clientRequestId
    });
  }

  async abortRun(params: RuntimeAbortChatParams): Promise<AbortChatResponse> {
    return this.mockGateway.abortRun(params.sessionId, params.runId);
  }
}


import type {
  AbortChatRequest,
  AbortChatResponse,
  ChatHistoryResponse,
  CreateSessionRequest,
  PatchSessionRequest,
  SendChatRequest,
  SendChatResponse,
  SessionSummary
} from "@contracts";

export interface SessionContext {
  sessionId: string;
  sessionKey: string;
}

export interface RuntimeChatHistoryParams extends SessionContext {}

export interface RuntimeSendChatParams extends SessionContext {
  message: SendChatRequest["message"];
  clientRequestId: SendChatRequest["clientRequestId"];
}

export interface RuntimeAbortChatParams extends SessionContext {
  runId: AbortChatRequest["runId"];
}

export interface BackendRuntime {
  listSessions(): Promise<SessionSummary[]>;
  createSession(input: CreateSessionRequest): Promise<SessionSummary>;
  patchSession(sessionId: string, input: PatchSessionRequest): Promise<SessionSummary>;
  getHistory(params: RuntimeChatHistoryParams): Promise<ChatHistoryResponse>;
  sendMessage(params: RuntimeSendChatParams): Promise<SendChatResponse>;
  abortRun(params: RuntimeAbortChatParams): Promise<AbortChatResponse>;
}


export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface CreateSessionRequest {
  name: string;
}

export type CreateSessionResponse = SessionSummary;

export interface PatchSessionRequest {
  title?: string;
  agentId?: string | null;
}

export type PatchSessionResponse = SessionSummary;

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface SendChatRequest {
  sessionId: string;
  message: string;
  clientRequestId: string;
}

export interface SendChatResponse {
  accepted: boolean;
  runId: string;
}

export interface AbortChatRequest {
  sessionId: string;
  runId: string;
}

export interface AbortChatResponse {
  accepted: boolean;
}

export interface MessageDeltaEvent {
  sessionId: string;
  runId: string;
  delta: string;
  createdAt: string;
}

export interface MessageFinalEvent {
  sessionId: string;
  runId: string;
  message: ChatMessage;
  createdAt: string;
}

export interface AgentEvent {
  sessionId: string;
  runId: string;
  stage: "thinking" | "tool" | "status";
  message: string;
  createdAt: string;
}

export interface RunAbortedEvent {
  sessionId: string;
  runId: string;
  createdAt: string;
}

export interface RunErrorEvent {
  sessionId: string;
  runId: string;
  error: string;
  createdAt: string;
}

export type SseEventName =
  | "message.delta"
  | "message.final"
  | "agent.event"
  | "run.aborted"
  | "run.error";

export interface SseEventPayloadMap {
  "message.delta": MessageDeltaEvent;
  "message.final": MessageFinalEvent;
  "agent.event": AgentEvent;
  "run.aborted": RunAbortedEvent;
  "run.error": RunErrorEvent;
}

export type AnySseEvent =
  | {
      event: "message.delta";
      data: MessageDeltaEvent;
    }
  | {
      event: "message.final";
      data: MessageFinalEvent;
    }
  | {
      event: "agent.event";
      data: AgentEvent;
    }
  | {
      event: "run.aborted";
      data: RunAbortedEvent;
    }
  | {
      event: "run.error";
      data: RunErrorEvent;
    };


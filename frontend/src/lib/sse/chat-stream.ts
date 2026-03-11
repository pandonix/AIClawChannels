import type {
  AgentEvent,
  MessageDeltaEvent,
  MessageFinalEvent,
  RunAbortedEvent,
  RunErrorEvent,
  SseEventName,
  SseEventPayloadMap
} from "@contracts";

import { API_BASE_URL } from "../../api/client";

export type ChatStreamConnectionState =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "error";

export interface ChatStreamHandlers {
  onOpen?: () => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: ChatStreamConnectionState) => void;
  onMessageDelta?: (payload: MessageDeltaEvent) => void;
  onMessageFinal?: (payload: MessageFinalEvent) => void;
  onAgentEvent?: (payload: AgentEvent) => void;
  onRunAborted?: (payload: RunAbortedEvent) => void;
  onRunError?: (payload: RunErrorEvent) => void;
}

export interface ChatStreamOptions {
  initialRetryMs?: number;
  maxRetryMs?: number;
}

function parseEventPayload<TEventName extends SseEventName>(
  eventName: TEventName,
  raw: MessageEvent<string>
): SseEventPayloadMap[TEventName] {
  try {
    return JSON.parse(raw.data) as SseEventPayloadMap[TEventName];
  } catch {
    throw new Error(`Failed to parse SSE payload for ${eventName}`);
  }
}

function retryDelay(attempt: number, initialRetryMs: number, maxRetryMs: number): number {
  return Math.min(initialRetryMs * 2 ** attempt, maxRetryMs);
}

export function createChatStream(
  sessionId: string,
  handlers: ChatStreamHandlers,
  options: ChatStreamOptions = {}
): () => void {
  const initialRetryMs = options.initialRetryMs ?? 1_000;
  const maxRetryMs = options.maxRetryMs ?? 10_000;
  let closed = false;
  let currentSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;

  function clearReconnectTimer(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function updateState(state: ChatStreamConnectionState): void {
    handlers.onStateChange?.(state);
  }

  function cleanupSource(): void {
    if (currentSource) {
      currentSource.close();
      currentSource = null;
    }
  }

  function scheduleReconnect(): void {
    if (closed || reconnectTimer) {
      return;
    }

    const delay = retryDelay(reconnectAttempt, initialRetryMs, maxRetryMs);
    reconnectAttempt += 1;
    updateState("reconnecting");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function bindEvent<TEventName extends SseEventName>(
    source: EventSource,
    eventName: TEventName,
    handler: ((payload: SseEventPayloadMap[TEventName]) => void) | undefined
  ): void {
    if (!handler) {
      return;
    }

    source.addEventListener(eventName, (event) => {
      try {
        handler(parseEventPayload(eventName, event as MessageEvent<string>));
      } catch (error) {
        handlers.onError?.(error as Error);
      }
    });
  }

  function connect(): void {
    if (closed) {
      return;
    }

    clearReconnectTimer();
    cleanupSource();
    updateState(reconnectAttempt === 0 ? "connecting" : "reconnecting");

    const source = new EventSource(
      `${API_BASE_URL}/api/chat/stream?sessionId=${encodeURIComponent(sessionId)}`
    );
    currentSource = source;

    source.onopen = () => {
      reconnectAttempt = 0;
      updateState("open");
      handlers.onOpen?.();
    };

    source.onerror = () => {
      if (closed) {
        return;
      }

      updateState("error");
      handlers.onError?.(new Error("SSE connection failed"));
      cleanupSource();
      scheduleReconnect();
    };

    bindEvent(source, "message.delta", handlers.onMessageDelta);
    bindEvent(source, "message.final", handlers.onMessageFinal);
    bindEvent(source, "agent.event", handlers.onAgentEvent);
    bindEvent(source, "run.aborted", handlers.onRunAborted);
    bindEvent(source, "run.error", handlers.onRunError);
  }

  connect();

  return () => {
    closed = true;
    clearReconnectTimer();
    cleanupSource();
    updateState("idle");
  };
}

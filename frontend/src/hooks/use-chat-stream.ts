import { useEffect, useState } from "react";

import type {
  AgentEvent,
  ChatMessage,
  MessageFinalEvent,
  RunAbortedEvent,
  RunErrorEvent
} from "@contracts";

import {
  createChatStream,
  type ChatStreamConnectionState
} from "../lib/sse/chat-stream";

export interface StreamingRun {
  runId: string;
  text: string;
  createdAt: string;
}

export interface StreamNotice {
  runId: string;
  type: "aborted" | "error";
  message: string;
  createdAt: string;
}

export interface ChatStreamState {
  agentEvents: AgentEvent[];
  connectionState: ChatStreamConnectionState;
  finalMessages: ChatMessage[];
  notices: StreamNotice[];
  streamError: string | null;
  streamingRuns: StreamingRun[];
}

function upsertFinalMessage(messages: ChatMessage[], nextMessage: MessageFinalEvent["message"]): ChatMessage[] {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex === -1) {
    return [...messages, nextMessage];
  }

  const updated = [...messages];
  updated[existingIndex] = nextMessage;
  return updated;
}

export function useChatStream(sessionId: string | null): ChatStreamState {
  const [connectionState, setConnectionState] = useState<ChatStreamState["connectionState"]>("idle");
  const [finalMessages, setFinalMessages] = useState<ChatMessage[]>([]);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [streamingRuns, setStreamingRuns] = useState<StreamingRun[]>([]);
  const [notices, setNotices] = useState<StreamNotice[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    setFinalMessages([]);
    setAgentEvents([]);
    setStreamingRuns([]);
    setNotices([]);
    setStreamError(null);

    if (!sessionId) {
      setConnectionState("idle");
      return;
    }

    return createChatStream(sessionId, {
      onStateChange(state) {
        setConnectionState(state);
      },
      onOpen() {
        setStreamError(null);
      },
      onError(error) {
        setStreamError(error.message);
      },
      onAgentEvent(payload) {
        setAgentEvents((current) => [...current.slice(-7), payload]);
      },
      onMessageDelta(payload) {
        setStreamingRuns((current) => {
          const existingIndex = current.findIndex((item) => item.runId === payload.runId);
          if (existingIndex === -1) {
            return [
              ...current,
              {
                runId: payload.runId,
                text: payload.delta,
                createdAt: payload.createdAt
              }
            ];
          }

          const updated = [...current];
          const existing = updated[existingIndex];
          if (!existing) {
            return current;
          }
          updated[existingIndex] = {
            runId: existing.runId,
            createdAt: existing.createdAt,
            text: `${existing.text}${payload.delta}`
          };
          return updated;
        });
      },
      onMessageFinal(payload) {
        setFinalMessages((current) => upsertFinalMessage(current, payload.message));
        setStreamingRuns((current) => current.filter((item) => item.runId !== payload.runId));
      },
      onRunAborted(payload: RunAbortedEvent) {
        setStreamingRuns((current) => current.filter((item) => item.runId !== payload.runId));
        setNotices((current) => [
          ...current.slice(-4),
          {
            runId: payload.runId,
            type: "aborted",
            message: "Run aborted",
            createdAt: payload.createdAt
          }
        ]);
      },
      onRunError(payload: RunErrorEvent) {
        setStreamingRuns((current) => current.filter((item) => item.runId !== payload.runId));
        setNotices((current) => [
          ...current.slice(-4),
          {
            runId: payload.runId,
            type: "error",
            message: payload.error,
            createdAt: payload.createdAt
          }
        ]);
      }
    }, {
      initialRetryMs: 1_000,
      maxRetryMs: 8_000
    });
  }, [sessionId]);

  return {
    agentEvents,
    connectionState,
    finalMessages,
    notices,
    streamError,
    streamingRuns
  };
}

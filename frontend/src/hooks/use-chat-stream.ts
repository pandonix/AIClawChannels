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

export interface StreamLogEntry {
  id: string;
  createdAt: string;
  detail: string;
  label: string;
  level: "info" | "success" | "warning" | "error";
}

export interface ChatStreamState {
  agentEvents: AgentEvent[];
  connectionState: ChatStreamConnectionState;
  finalMessages: ChatMessage[];
  notices: StreamNotice[];
  streamError: string | null;
  streamingRuns: StreamingRun[];
  transportLogs: StreamLogEntry[];
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
  const [transportLogs, setTransportLogs] = useState<StreamLogEntry[]>([]);

  function appendLog(entry: Omit<StreamLogEntry, "id">): void {
    setTransportLogs((current) => [
      ...current.slice(-29),
      {
        id: `${entry.createdAt}-${entry.label}-${entry.detail}`,
        ...entry
      }
    ]);
  }

  useEffect(() => {
    setFinalMessages([]);
    setAgentEvents([]);
    setStreamingRuns([]);
    setNotices([]);
    setStreamError(null);
    setTransportLogs([]);

    if (!sessionId) {
      setConnectionState("idle");
      return;
    }

    appendLog({
      createdAt: new Date().toISOString(),
      detail: `session=${sessionId}`,
      label: "stream.init",
      level: "info"
    });

    return createChatStream(sessionId, {
      onStateChange(state) {
        setConnectionState(state);
        appendLog({
          createdAt: new Date().toISOString(),
          detail: `state=${state}`,
          label: "stream.state",
          level: state === "error" ? "error" : state === "open" ? "success" : "info"
        });
      },
      onOpen() {
        setStreamError(null);
        appendLog({
          createdAt: new Date().toISOString(),
          detail: "event source connected",
          label: "stream.open",
          level: "success"
        });
      },
      onError(error) {
        setStreamError(error.message);
        appendLog({
          createdAt: new Date().toISOString(),
          detail: error.message,
          label: "stream.error",
          level: "error"
        });
      },
      onAgentEvent(payload) {
        setAgentEvents((current) => [...current.slice(-7), payload]);
        appendLog({
          createdAt: payload.createdAt,
          detail: `${payload.stage}: ${payload.message}`,
          label: "agent.event",
          level: payload.stage === "tool" ? "warning" : "info"
        });
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
        appendLog({
          createdAt: payload.createdAt,
          detail: `run=${payload.runId} delta=${payload.delta.length} chars`,
          label: "message.delta",
          level: "info"
        });
      },
      onMessageFinal(payload) {
        setFinalMessages((current) => upsertFinalMessage(current, payload.message));
        setStreamingRuns((current) => current.filter((item) => item.runId !== payload.runId));
        appendLog({
          createdAt: payload.createdAt,
          detail: `run=${payload.runId} message=${payload.message.id}`,
          label: "message.final",
          level: "success"
        });
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
        appendLog({
          createdAt: payload.createdAt,
          detail: `run=${payload.runId}`,
          label: "run.aborted",
          level: "warning"
        });
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
        appendLog({
          createdAt: payload.createdAt,
          detail: `run=${payload.runId} error=${payload.error}`,
          label: "run.error",
          level: "error"
        });
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
    streamingRuns,
    transportLogs
  };
}

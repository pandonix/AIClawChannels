import type {
  AgentEvent,
  AnySseEvent,
  ChatMessage,
  MessageDeltaEvent,
  MessageFinalEvent,
  RunAbortedEvent,
  RunErrorEvent
} from "@contracts";

import { GatewayConnectionManager } from "../gateway/connection-manager.js";
import type { GatewayEventFrame } from "../gateway/types.js";
import type { BackendEventSource, EventBusListener } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function timestampToIso(value: unknown): string {
  const numeric = asNumber(value);
  if (numeric !== undefined) {
    return new Date(numeric).toISOString();
  }

  const text = asString(value);
  if (text) {
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).filter(Boolean).join("\n").trim();
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  const direct = [record.text, record.content, record.message, record.value]
    .map((item) => (typeof item === "string" ? item : undefined))
    .find(Boolean);
  if (direct) {
    return direct;
  }

  if (Array.isArray(record.parts)) {
    return extractText(record.parts);
  }
  if (Array.isArray(record.blocks)) {
    return extractText(record.blocks);
  }
  if (Array.isArray(record.items)) {
    return extractText(record.items);
  }

  return "";
}

function toAssistantMessage(payload: Record<string, unknown>): ChatMessage {
  const message = asRecord(payload.message) ?? payload;
  return {
    id:
      asString(message.id) ??
      asString(message.messageId) ??
      `${asString(payload.runId) ?? "run"}:final`,
    role: "assistant",
    text: extractText(message),
    createdAt: timestampToIso(message.createdAt ?? message.timestamp ?? payload.ts)
  };
}

function toHistoryAssistantMessage(raw: unknown): ChatMessage | null {
  const record = asRecord(raw);
  if (!record || asString(record.role) !== "assistant") {
    return null;
  }

  const text = extractText(record.content ?? record.message ?? record);
  if (!text.trim()) {
    return null;
  }

  return {
    id: asString(record.id) ?? asString(record.messageId) ?? "history:assistant",
    role: "assistant",
    text,
    createdAt: timestampToIso(record.createdAt ?? record.timestamp ?? record.ts)
  };
}

function toAgentStage(stream?: string): AgentEvent["stage"] {
  if (stream === "tool") {
    return "tool";
  }
  if (stream === "lifecycle") {
    return "status";
  }
  return "thinking";
}

function matchesSessionKey(expected: string, actual: string): boolean {
  if (expected === actual) {
    return true;
  }

  return actual.endsWith(`:${expected}`);
}

function mapGatewayEvent(sessionId: string, frame: GatewayEventFrame): AnySseEvent | null {
  if (frame.event === "chat") {
    const payload = asRecord(frame.payload);
    if (!payload) {
      return null;
    }

    const sessionKey = asString(payload.sessionKey);
    if (!sessionKey) {
      return null;
    }

    const runId = asString(payload.runId) ?? "unknown";
    const createdAt = timestampToIso(payload.createdAt ?? payload.ts);
      const state = asString(payload.state);

    if (state === "delta") {
      const event: MessageDeltaEvent = {
        sessionId,
        runId,
        delta: extractText(payload.message),
        createdAt
      };
      return { event: "message.delta", data: event };
    }

    if (state === "final") {
      const finalMessage = toAssistantMessage(payload);
      if (!finalMessage.text.trim()) {
        return null;
      }
      const event: MessageFinalEvent = {
        sessionId,
        runId,
        message: finalMessage,
        createdAt: finalMessage.createdAt
      };
      return { event: "message.final", data: event };
    }

    if (state === "aborted") {
      const event: RunAbortedEvent = {
        sessionId,
        runId,
        createdAt
      };
      return { event: "run.aborted", data: event };
    }

    if (state === "error") {
      const event: RunErrorEvent = {
        sessionId,
        runId,
        error: asString(payload.errorMessage) ?? "gateway chat run failed",
        createdAt
      };
      return { event: "run.error", data: event };
    }
  }

  if (frame.event === "agent") {
    const payload = asRecord(frame.payload);
    if (!payload) {
      return null;
    }

    const runId = asString(payload.runId);
    if (!runId) {
      return null;
    }

    const event: AgentEvent = {
      sessionId,
      runId,
      stage: toAgentStage(asString(payload.stream)),
      message:
        extractText(payload.data) ||
        asString(asRecord(payload.data)?.phase) ||
        asString(payload.stream) ||
        "agent event",
      createdAt: timestampToIso(payload.ts)
    };
    return { event: "agent.event", data: event };
  }

  return null;
}

export class GatewayEventSource implements BackendEventSource {
  constructor(private readonly gateway: GatewayConnectionManager) {}

  private async emitFinalFromHistory(
    sessionId: string,
    sessionKey: string,
    runId: string,
    listener: EventBusListener
  ): Promise<void> {
    const response = await this.gateway.request<{ messages?: unknown[] } | unknown[]>("chat.history", {
      sessionKey,
      limit: 20
    });
    const messages = Array.isArray(response)
      ? response
      : Array.isArray(asRecord(response)?.messages)
        ? ((asRecord(response)?.messages as unknown[]) ?? [])
        : [];
    const assistantMessage = [...messages]
      .reverse()
      .map((message) => toHistoryAssistantMessage(message))
      .find((message): message is ChatMessage => message !== null);

    if (!assistantMessage) {
      return;
    }

    listener({
      event: "message.final",
      data: {
        sessionId,
        runId,
        message: assistantMessage,
        createdAt: assistantMessage.createdAt
      }
    });
  }

  subscribe(sessionId: string, sessionKey: string, listener: EventBusListener): () => void {
    const handleEvent = (frame: GatewayEventFrame): void => {
      const payload = asRecord(frame.payload);
      const payloadSessionKey = asString(payload?.sessionKey);
      if (!payloadSessionKey || !matchesSessionKey(sessionKey, payloadSessionKey)) {
        return;
      }

      const mapped = mapGatewayEvent(sessionId, frame);
      if (mapped) {
        listener(mapped);
        return;
      }

      if (frame.event === "chat" && asString(payload?.state) === "final" && payloadSessionKey) {
        void this.emitFinalFromHistory(
          sessionId,
          payloadSessionKey,
          asString(payload?.runId) ?? "unknown",
          listener
        );
      }
    };

    this.gateway.on("event", handleEvent);
    return () => {
      this.gateway.off("event", handleEvent);
    };
  }
}

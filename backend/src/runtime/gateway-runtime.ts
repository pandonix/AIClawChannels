import { randomUUID } from "node:crypto";

import type {
  AbortChatResponse,
  ChatHistoryResponse,
  ChatMessage,
  CreateSessionRequest,
  PatchSessionRequest,
  SendChatResponse,
  SessionSummary
} from "@contracts";

import { GatewayConnectionManager } from "../gateway/connection-manager.js";
import type {
  BackendRuntime,
  RuntimeAbortChatParams,
  RuntimeChatHistoryParams,
  RuntimeSendChatParams
} from "./types.js";

interface GatewaySessionRow {
  key?: string;
  sessionId?: string;
  updatedAt?: number;
  label?: string;
  displayName?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  messages?: unknown[];
}

interface GatewayChatSendResponse {
  runId?: string;
  status?: string;
}

interface GatewaySessionsListResponse {
  sessions?: GatewaySessionRow[];
}

type RuntimeSessionSummary = SessionSummary & {
  sessionKey: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function preview(text: string): string {
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function timestampToIso(value: unknown, fallback: string): string {
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

  return fallback;
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item))
      .filter(Boolean)
      .join("\n")
      .trim();
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
  if (Array.isArray(record.content)) {
    return extractText(record.content);
  }
  if (Array.isArray(record.items)) {
    return extractText(record.items);
  }

  return "";
}

function toChatMessage(raw: unknown, index: number): ChatMessage | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const role = asString(record.role);
  if (role !== "user" && role !== "assistant") {
    return null;
  }

  const text = extractText(record);
  if (!text.trim()) {
    return null;
  }

  const fallbackTime = nowIso();
  return {
    id:
      asString(record.id) ??
      asString(record.messageId) ??
      asString(record.entryId) ??
      `hist_${index + 1}`,
    role,
    text,
    createdAt: timestampToIso(record.createdAt ?? record.timestamp ?? record.ts, fallbackTime)
  };
}

function deriveBusinessSessionId(row: GatewaySessionRow): string {
  const key = row.key?.trim();
  if (key) {
    const match = key.match(/(?:^|:)((?:sess|session)_[^:]+)$/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return row.sessionId?.trim() || `sess_${randomUUID()}`;
}

function toSessionSummary(row: GatewaySessionRow): RuntimeSessionSummary {
  const updatedAt = timestampToIso(row.updatedAt, nowIso());
  const lastMessage = Array.isArray(row.messages) ? toChatMessage(row.messages.at(-1), row.messages.length - 1) : null;
  const sessionKey = row.key?.trim() || `web:user_001:${row.sessionId ?? randomUUID()}`;
  const sessionId = deriveBusinessSessionId(row);
  return {
    id: sessionId,
    sessionKey,
    title: row.label?.trim() || row.displayName?.trim() || row.derivedTitle?.trim() || sessionKey,
    agentId: null,
    createdAt: updatedAt,
    updatedAt,
    lastMessagePreview: row.lastMessagePreview?.trim() || (lastMessage ? preview(lastMessage.text) : null)
  };
}

export class GatewayRuntime implements BackendRuntime {
  private readonly localSessions = new Map<string, RuntimeSessionSummary>();

  constructor(private readonly gateway: GatewayConnectionManager) {}

  async listSessions(): Promise<SessionSummary[]> {
    const response = await this.gateway.request<GatewaySessionsListResponse | GatewaySessionRow[]>(
      "sessions.list",
      {
      limit: 200,
      includeDerivedTitles: true,
      includeLastMessage: true
      }
    );
    const rows = Array.isArray(response)
      ? response
      : Array.isArray(asRecord(response)?.sessions)
        ? (asRecord(response)?.sessions as GatewaySessionRow[])
        : [];
    const sessions = Array.isArray(rows) ? rows.map((row) => toSessionSummary(row)) : [];

    for (const session of sessions) {
      const existing = this.localSessions.get(session.id);
      this.localSessions.set(session.id, {
        ...existing,
        ...session,
        title: existing?.title && existing.title !== existing.sessionKey ? existing.title : session.title,
        agentId: existing?.agentId ?? session.agentId
      });
    }

    return [...this.localSessions.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  async createSession(input: CreateSessionRequest): Promise<SessionSummary> {
    const createdAt = nowIso();
    const sessionId = `sess_${randomUUID()}`;
    const session: RuntimeSessionSummary = {
      id: sessionId,
      sessionKey: `web:user_001:${sessionId}`,
      title: input.name,
      agentId: null,
      createdAt,
      updatedAt: createdAt,
      lastMessagePreview: null
    };
    this.localSessions.set(session.id, session);
    return session;
  }

  async patchSession(sessionId: string, input: PatchSessionRequest): Promise<SessionSummary> {
    const existing = this.localSessions.get(sessionId);
    if (!existing) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    if (input.title?.trim()) {
      await this.gateway.request("sessions.patch", {
        key: existing.sessionKey,
        label: input.title.trim()
      });
    }

    const updated: RuntimeSessionSummary = {
      ...existing,
      title: input.title?.trim() || existing.title,
      agentId: input.agentId ?? existing.agentId,
      updatedAt: nowIso()
    };
    this.localSessions.set(sessionId, updated);
    return updated;
  }

  async getHistory(params: RuntimeChatHistoryParams): Promise<ChatHistoryResponse> {
    const response = await this.gateway.request<{ messages?: unknown[] } | unknown[]>("chat.history", {
      sessionKey: params.sessionKey,
      limit: 200
    });

    const rawMessages = Array.isArray(response)
      ? response
      : Array.isArray(asRecord(response)?.messages)
        ? (asRecord(response)?.messages as unknown[])
        : [];

    return {
      messages: rawMessages
        .map((message, index) => toChatMessage(message, index))
        .filter((message): message is ChatMessage => message !== null)
    };
  }

  async sendMessage(params: RuntimeSendChatParams): Promise<SendChatResponse> {
    const response = await this.gateway.request<GatewayChatSendResponse>("chat.send", {
      sessionKey: params.sessionKey,
      message: params.message,
      deliver: false,
      idempotencyKey: params.clientRequestId
    });

    const existing = this.localSessions.get(params.sessionId);
    if (existing) {
      this.localSessions.set(params.sessionId, {
        ...existing,
        updatedAt: nowIso(),
        lastMessagePreview: preview(params.message)
      });
    }

    return {
      accepted: true,
      runId: response.runId ?? randomUUID()
    };
  }

  async abortRun(params: RuntimeAbortChatParams): Promise<AbortChatResponse> {
    await this.gateway.request("chat.abort", {
      sessionKey: params.sessionKey,
      runId: params.runId
    });
    return {
      accepted: true
    };
  }
}

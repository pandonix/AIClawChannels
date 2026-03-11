import { EventEmitter } from "node:events";

import type {
  AbortChatResponse,
  AgentEvent,
  AnySseEvent,
  ChatHistoryResponse,
  ChatMessage,
  CreateSessionRequest,
  PatchSessionRequest,
  SendChatRequest,
  SendChatResponse,
  SessionSummary,
  SseEventName,
  SseEventPayloadMap
} from "@contracts";

interface ChatRun {
  id: string;
  sessionId: string;
  status: "running" | "completed" | "aborted";
  createdAt: string;
}

type EventListener = (event: AnySseEvent) => void;

function now(): string {
  return new Date().toISOString();
}

function preview(text: string): string {
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

export class MockGateway {
  private readonly emitter = new EventEmitter();
  private readonly sessions = new Map<string, SessionSummary>();
  private readonly messages = new Map<string, ChatMessage[]>();
  private readonly runs = new Map<string, ChatRun>();
  private readonly timers = new Map<string, NodeJS.Timeout[]>();
  private sessionCounter = 1;
  private messageCounter = 2;
  private runCounter = 1;

  constructor() {
    const createdAt = now();
    const session: SessionSummary = {
      id: "sess_001",
      title: "默认会话",
      agentId: null,
      createdAt,
      updatedAt: createdAt,
      lastMessagePreview: "你好，有什么需要处理？"
    };
    const seededMessages: ChatMessage[] = [
      {
        id: "msg_001",
        role: "user",
        text: "你好",
        createdAt
      },
      {
        id: "msg_002",
        role: "assistant",
        text: "你好，有什么需要处理？",
        createdAt
      }
    ];
    this.sessions.set(session.id, session);
    this.messages.set(session.id, seededMessages);
    this.sessionCounter = 2;
    this.messageCounter = 3;
  }

  listSessions(): SessionSummary[] {
    return [...this.sessions.values()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  createSession(input: CreateSessionRequest): SessionSummary {
    const createdAt = now();
    const session: SessionSummary = {
      id: `sess_${String(this.sessionCounter).padStart(3, "0")}`,
      title: input.name,
      agentId: null,
      createdAt,
      updatedAt: createdAt,
      lastMessagePreview: null
    };
    this.sessionCounter += 1;
    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);
    return session;
  }

  patchSession(sessionId: string, input: PatchSessionRequest): SessionSummary {
    const session = this.getSession(sessionId);
    const updated: SessionSummary = {
      ...session,
      title: input.title ?? session.title,
      agentId: input.agentId ?? session.agentId,
      updatedAt: now()
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  getHistory(sessionId: string): ChatHistoryResponse {
    this.getSession(sessionId);
    return {
      messages: [...(this.messages.get(sessionId) ?? [])]
    };
  }

  sendMessage(input: SendChatRequest): SendChatResponse {
    const session = this.getSession(input.sessionId);
    const userMessage: ChatMessage = {
      id: `msg_${String(this.messageCounter).padStart(3, "0")}`,
      role: "user",
      text: input.message,
      createdAt: now()
    };
    this.messageCounter += 1;
    const runId = `run_${String(this.runCounter).padStart(3, "0")}`;
    this.runCounter += 1;
    const run: ChatRun = {
      id: runId,
      sessionId: session.id,
      status: "running",
      createdAt: now()
    };

    this.messages.set(session.id, [...(this.messages.get(session.id) ?? []), userMessage]);
    this.runs.set(run.id, run);
    this.sessions.set(session.id, {
      ...session,
      updatedAt: now(),
      lastMessagePreview: preview(input.message)
    });

    const finalText = [
      "这是 mock provider 生成的流式回复。",
      `当前会话: ${session.title}`,
      `原始消息: ${input.message}`
    ].join(" ");

    const timers = [
      setTimeout(() => {
        this.emit("agent.event", {
          sessionId: session.id,
          runId,
          stage: "thinking",
          message: "Mock Gateway 正在分析请求。",
          createdAt: now()
        });
      }, 150),
      setTimeout(() => {
        this.emit("message.delta", {
          sessionId: session.id,
          runId,
          delta: "正在整理上下文... ",
          createdAt: now()
        });
      }, 400),
      setTimeout(() => {
        this.emit("message.delta", {
          sessionId: session.id,
          runId,
          delta: "准备返回 mock 结果... ",
          createdAt: now()
        });
      }, 800),
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `msg_${String(this.messageCounter).padStart(3, "0")}`,
          role: "assistant",
          text: finalText,
          createdAt: now()
        };
        this.messageCounter += 1;
        this.messages.set(session.id, [
          ...(this.messages.get(session.id) ?? []),
          assistantMessage
        ]);
        this.sessions.set(session.id, {
          ...this.getSession(session.id),
          updatedAt: assistantMessage.createdAt,
          lastMessagePreview: preview(finalText)
        });
        this.runs.set(run.id, {
          ...run,
          status: "completed"
        });
        this.emit("message.final", {
          sessionId: session.id,
          runId,
          message: assistantMessage,
          createdAt: assistantMessage.createdAt
        });
        this.timers.delete(runId);
      }, 1200)
    ];

    this.timers.set(runId, timers);

    return {
      accepted: true,
      runId
    };
  }

  abortRun(sessionId: string, runId: string): AbortChatResponse {
    this.getSession(sessionId);
    const run = this.runs.get(runId);
    if (!run || run.sessionId !== sessionId || run.status !== "running") {
      return { accepted: true };
    }

    const timers = this.timers.get(runId) ?? [];
    for (const timer of timers) {
      clearTimeout(timer);
    }
    this.timers.delete(runId);
    this.runs.set(runId, {
      ...run,
      status: "aborted"
    });
    this.emit("run.aborted", {
      sessionId,
      runId,
      createdAt: now()
    });
    return {
      accepted: true
    };
  }

  subscribe(sessionId: string, listener: EventListener): () => void {
    this.getSession(sessionId);
    const channel = this.channel(sessionId);
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  private emit<TEventName extends SseEventName>(
    event: TEventName,
    data: SseEventPayloadMap[TEventName]
  ): void {
    this.emitter.emit(this.channel(data.sessionId), { event, data });
  }

  private getSession(sessionId: string): SessionSummary {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    return session;
  }

  private channel(sessionId: string): string {
    return `session:${sessionId}`;
  }
}

export function buildMockGateway(): MockGateway {
  return new MockGateway();
}


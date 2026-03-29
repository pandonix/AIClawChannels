import type {
  ActiveRunStatus,
  ResourceStatus,
} from "../../features/workbench/workbench-state";
import type { AgentEvent, ChatMessage, MessageDeltaEvent } from "@contracts";

const messageTone = {
  assistant:
    "bg-white/[0.045] text-ink-50 ring-1 ring-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.28)]",
  system:
    "bg-accent-400/10 text-accent-300 ring-1 ring-accent-400/20 shadow-[0_18px_48px_rgba(0,0,0,0.22)]",
  user:
    "bg-accent-400/18 text-ink-50 ring-1 ring-accent-300/35 shadow-[0_24px_56px_rgba(3,18,29,0.4)]",
} as const;

const timelineTone = {
  status: "text-success-400",
  thinking: "text-warning-400",
  tool: "text-accent-300",
} as const;

function formatTime(isoTime: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoTime));
}

interface ChatCanvasProps {
  activeRunStatus: ActiveRunStatus;
  messages: ChatMessage[];
  liveMessage: MessageDeltaEvent | null;
  agentEvents: AgentEvent[];
  historyError: string | null;
  historyStatus: ResourceStatus;
  sessionId: string | null;
}

export function ChatCanvas({
  activeRunStatus,
  messages,
  liveMessage,
  agentEvents,
  historyError,
  historyStatus,
  sessionId,
}: ChatCanvasProps) {
  const showEmptyState =
    historyStatus === "empty" && messages.length === 0 && !liveMessage;
  const showRunPanel =
    Boolean(liveMessage) || agentEvents.length > 0 || activeRunStatus !== "idle";

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/8 bg-canvas-950/85">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.32em] text-ink-300">
            Chat Canvas
          </p>
          <p className="mt-1 text-sm text-ink-300">
            聊天区保持主视觉中心，管理能力通过抽屉、弹窗与浮层进入。
          </p>
        </div>
        <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink-300 sm:inline-flex">
          Desktop Only
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-[980px] flex-col gap-5">
          <div className="self-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.24em] text-ink-300">
            {sessionId ? `Session ${sessionId}` : "No Session Selected"}
          </div>

          {!sessionId ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-ink-300">
                Empty Workspace
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                当前没有可用会话。通过左侧抽屉创建第一条会话后，这里会进入正常聊天工作台。
              </p>
            </div>
          ) : null}

          {historyStatus === "loading" ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-ink-300">
                Loading History
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                正在拉取当前会话历史，并为这个 session 重建 SSE 连接。
              </p>
            </div>
          ) : null}

          {historyStatus === "error" ? (
            <div className="rounded-[28px] border border-danger-400/20 bg-danger-400/8 px-5 py-8 text-center">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-danger-400">
                History Error
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                {historyError}
              </p>
            </div>
          ) : null}

          {showEmptyState ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-ink-300">
                No Messages Yet
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                这个会话已经存在，但还没有历史消息。发送链路会在后续里程碑接入。
              </p>
            </div>
          ) : null}

          {historyStatus !== "loading" && historyStatus !== "error"
            ? messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <article
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[76%] rounded-[28px] px-5 py-4 ${messageTone[message.role]}`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-5">
                        <span className="font-display text-sm uppercase tracking-[0.28em] text-ink-200">
                          {message.role}
                        </span>
                        <span className="font-mono text-xs text-ink-300">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-[15px] leading-7 text-balance text-ink-50">
                        {message.text}
                      </p>
                    </div>
                  </article>
                );
              })
            : null}

          {showRunPanel ? (
            <article className="rounded-[30px] border border-accent-300/15 bg-[linear-gradient(135deg,rgba(29,198,255,0.16),rgba(8,15,23,0.92)_46%,rgba(8,15,23,0.97))] px-5 py-5 shadow-[0_28px_90px_rgba(3,10,20,0.52)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-accent-300/30 bg-accent-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-accent-300">
                  {liveMessage ? "message.delta" : "run.active"}
                </span>
                <span className="font-mono text-xs text-ink-300">
                  {liveMessage?.runId ?? "pending"}
                </span>
              </div>
              <p className="mt-4 text-base leading-8 text-ink-50">
                {liveMessage?.delta ?? "Run accepted. Waiting for agent events or first delta..."}
                {liveMessage ? (
                  <span className="ml-1 inline-flex h-[1.05em] w-[0.62ch] animate-pulse rounded-sm bg-accent-300 align-middle" />
                ) : null}
              </p>
              <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-3">
                {agentEvents.map((event) => (
                  <div
                    key={`${event.stage}-${event.createdAt}`}
                    className="rounded-[22px] border border-white/10 bg-black/15 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`font-display text-xs uppercase tracking-[0.28em] ${timelineTone[event.stage]}`}
                      >
                        {event.stage}
                      </span>
                      <span className="font-mono text-[11px] text-ink-300">
                        {formatTime(event.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-200">
                      {event.message}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-ink-300">
                No Live Run
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                当前没有活动 run。发送消息后，这里会显示 delta 与 agent timeline。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import {
  previewAgentTimeline,
  previewDelta,
  previewHistory,
  previewSendRequest,
  previewSessions,
} from "./app/workbench-seed";
import { env } from "./config/env";

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

function App() {
  const currentSession = previewSessions[0]!;

  return (
    <div className="min-h-screen px-5 py-5 text-ink-50 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1480px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-canvas-900/85 shadow-workbench backdrop-blur">
        <header className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold tracking-[0.24em] text-ink-200 transition hover:border-accent-300/45 hover:text-ink-50"
            >
              Sessions
            </button>
            <div>
              <p className="font-display text-[0.72rem] uppercase tracking-[0.34em] text-ink-300">
                {env.appName}
              </p>
              <h1 className="font-display text-2xl tracking-[-0.04em] text-ink-50 sm:text-[2.2rem]">
                {currentSession.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-success-400/20 bg-success-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-success-400">
              SSE Ready
            </span>
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-ink-300 sm:inline-flex">
              {env.isDev ? "Dev Runtime" : "Prod Runtime"}
            </span>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-ink-200 transition hover:border-accent-300/45 hover:text-ink-50"
            >
              Settings
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-5 sm:px-6 sm:pb-6">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border border-white/8 bg-canvas-950/80 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-accent-300/25 bg-accent-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-accent-300">
                  Active Session
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                  {currentSession.id}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ink-300">
                  agentId {currentSession.agentId ?? "null"}
                </span>
              </div>
            </div>

            <div className="hidden rounded-[28px] border border-white/8 bg-canvas-950/70 px-5 py-4 xl:block">
              <p className="font-display text-sm uppercase tracking-[0.28em] text-ink-300">
                Runtime Baseline
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-200">
                React + TypeScript + Vite 已就位，Tailwind token、共享 contract 与 API Base URL 配置已接通。
              </p>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/8 bg-canvas-950/85">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="font-display text-sm uppercase tracking-[0.32em] text-ink-300">
                  Chat Canvas
                </p>
                <p className="mt-1 text-sm text-ink-300">
                  聊天区保持主视觉中心，管理能力暂时隐入按钮与状态胶囊。
                </p>
              </div>
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink-300 sm:inline-flex">
                Desktop Only
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto flex max-w-[980px] flex-col gap-5">
                <div className="self-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.24em] text-ink-300">
                  Sunday 08:10
                </div>

                {previewHistory.map((message) => {
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
                })}

                <article className="rounded-[30px] border border-accent-300/15 bg-[linear-gradient(135deg,rgba(29,198,255,0.16),rgba(8,15,23,0.92)_46%,rgba(8,15,23,0.97))] px-5 py-5 shadow-[0_28px_90px_rgba(3,10,20,0.52)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-accent-300/30 bg-accent-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-accent-300">
                      message.delta
                    </span>
                    <span className="font-mono text-xs text-ink-300">
                      {previewDelta.runId}
                    </span>
                  </div>
                  <p className="mt-4 text-base leading-8 text-ink-50">
                    {previewDelta.delta}
                    <span className="ml-1 inline-flex h-[1.05em] w-[0.62ch] animate-pulse rounded-sm bg-accent-300 align-middle" />
                  </p>
                  <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-3">
                    {previewAgentTimeline.map((event) => (
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
              </div>
            </div>

            <div className="border-t border-white/8 px-5 pb-5 pt-4">
              <div className="mx-auto flex max-w-[980px] flex-col gap-4">
                <div className="grid gap-3 rounded-[30px] border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="block">
                    <span className="mb-3 block font-display text-xs uppercase tracking-[0.3em] text-ink-300">
                      Composer
                    </span>
                    <textarea
                      className="min-h-28 w-full resize-none rounded-[22px] border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 text-ink-100 outline-none placeholder:text-ink-300/70"
                      defaultValue={previewSendRequest.message}
                      aria-label="Composer preview"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-warning-400/30 bg-warning-400/10 px-5 py-3 text-sm font-semibold text-warning-400 transition hover:border-warning-400/60"
                    >
                      Stop
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-accent-300 px-6 py-3 text-sm font-semibold text-canvas-950 transition hover:bg-white"
                    >
                      Send
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
                  <div className="rounded-[26px] border border-white/8 bg-canvas-900/60 px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-ink-300">
                        API Base
                      </span>
                      <code className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-mono text-xs text-ink-200">
                        {env.apiBaseUrl}
                      </code>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-ink-200">
                      这一版先完成工程基线，不提前暴露后端尚未稳定的假能力，后续按 TODO 逐步接入 sessions、history、send、abort 与 SSE。
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-white/8 bg-canvas-900/60 px-4 py-4">
                    <p className="font-display text-xs uppercase tracking-[0.3em] text-ink-300">
                      Seed Sessions
                    </p>
                    <div className="mt-3 space-y-3">
                      {previewSessions.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-[22px] border border-white/10 bg-black/15 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium text-ink-100">{session.title}</p>
                            <span className="font-mono text-[11px] text-ink-300">
                              {formatTime(session.updatedAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-ink-300">
                            {session.lastMessagePreview}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;

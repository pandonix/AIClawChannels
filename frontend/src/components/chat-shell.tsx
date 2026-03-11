import type { SessionSummary } from "@contracts";

import type { ChatStreamState } from "../hooks/use-chat-stream";

interface ChatShellProps {
  session: SessionSummary | null;
  titleDraft: string;
  onTitleDraftChange: (value: string) => void;
  onRenameSession: () => void;
  isRenamingSession: boolean;
  streamState: ChatStreamState;
}

const skeletonMessages = [
  {
    id: "user-outline",
    role: "user" as const,
    title: "User prompt",
    body: "A selected session will load message history here in T1.D3."
  },
  {
    id: "assistant-outline",
    role: "assistant" as const,
    title: "Assistant response",
    body: "Streaming output, agent events, and stop controls remain scoped to later tracks."
  }
];

function roleLabel(role: "user" | "assistant"): string {
  return role === "user" ? "User" : "Assistant";
}

function formatStreamStamp(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function ChatShell({
  session,
  titleDraft,
  onTitleDraftChange,
  onRenameSession,
  isRenamingSession,
  streamState
}: ChatShellProps) {
  const hasLiveContent =
    streamState.finalMessages.length > 0 ||
    streamState.streamingRuns.length > 0 ||
    streamState.notices.length > 0;
  return (
    <section className="chat-shell">
      <header className="chat-header">
        <div className="chat-header__title-block">
          <p className="chat-header__eyebrow">Workspace</p>
          <h2>{session?.title ?? "Select a session"}</h2>
          <div className="title-editor">
            <label className="title-editor__label" htmlFor="session-title">
              Rename current session
            </label>
            <div className="title-editor__controls">
              <input
                id="session-title"
                className="text-input"
                type="text"
                value={titleDraft}
                placeholder="新的会话标题"
                disabled={!session}
                onChange={(event) => onTitleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onRenameSession();
                  }
                }}
              />
              <button
                type="button"
                className="ghost-button ghost-button--light"
                onClick={onRenameSession}
                disabled={!session || isRenamingSession || !titleDraft.trim()}
              >
                {isRenamingSession ? "Saving..." : "Save Title"}
              </button>
            </div>
          </div>
        </div>
        <div className="chat-header__status">
          <span className="status-pill">Mock backend connected</span>
          <span className={`status-pill${streamState.connectionState === "open" ? "" : " status-pill--muted"}`}>
            SSE {streamState.connectionState}
          </span>
          {streamState.streamError ? (
            <span className="status-pill status-pill--error">{streamState.streamError}</span>
          ) : null}
        </div>
      </header>

      <section className="chat-summary">
        <article className="summary-card">
          <span className="summary-card__label">Session ID</span>
          <strong>{session?.id ?? "No active session"}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Agent</span>
          <strong>{session?.agentId ?? "default agent"}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Latest preview</span>
          <strong>{session?.lastMessagePreview ?? "Waiting for chat history"}</strong>
        </article>
      </section>

      <section className="message-stage">
        <div className="message-stage__rail">
          <span>Timeline</span>
          <span>{streamState.agentEvents.length} agent events</span>
          {streamState.agentEvents.length > 0 ? (
            <div className="event-stack">
              {streamState.agentEvents.map((event) => (
                <article key={`${event.runId}-${event.createdAt}`} className="event-card">
                  <strong>{event.stage}</strong>
                  <span>{event.message}</span>
                  <time>{formatStreamStamp(event.createdAt)}</time>
                </article>
              ))}
            </div>
          ) : (
            <span>Waiting for live agent events</span>
          )}
        </div>
        <div className="message-stage__list">
          {hasLiveContent
            ? null
            : skeletonMessages.map((message) => (
                <article key={message.id} className={`message-card message-card--${message.role}`}>
                  <div className="message-card__meta">
                    <span>{roleLabel(message.role)}</span>
                    <span>{message.title}</span>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
          {streamState.streamingRuns.map((run) => (
            <article key={run.runId} className="message-card message-card--assistant message-card--live">
              <div className="message-card__meta">
                <span>Assistant</span>
                <span>Streaming {run.runId}</span>
              </div>
              <p>{run.text || "Waiting for delta..."}</p>
            </article>
          ))}
          {streamState.finalMessages.map((message) => (
            <article key={message.id} className={`message-card message-card--${message.role}`}>
              <div className="message-card__meta">
                <span>{roleLabel(message.role as "user" | "assistant")}</span>
                <span>{formatStreamStamp(message.createdAt)}</span>
              </div>
              <p>{message.text}</p>
            </article>
          ))}
          {streamState.notices.map((notice) => (
            <article key={`${notice.type}-${notice.runId}-${notice.createdAt}`} className="message-card message-card--notice">
              <div className="message-card__meta">
                <span>{notice.type === "error" ? "Run error" : "Run aborted"}</span>
                <span>{notice.runId}</span>
              </div>
              <p>{notice.message}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="composer-shell">
        <div className="composer-shell__header">
          <div>
            <p className="chat-header__eyebrow">Composer</p>
            <h3>Input area reserved for T1.D3</h3>
          </div>
          <button type="button" className="ghost-button" disabled>
            Stop
          </button>
        </div>
        <textarea
          className="composer-shell__input"
          rows={5}
          placeholder="Type a message, attach run metadata, and send from this panel in the next track."
          disabled
        />
        <div className="composer-shell__actions">
          <span>Contract ready: `POST /api/chat/send`, `POST /api/chat/abort`, `GET /api/chat/stream`</span>
          <button type="button" className="primary-button" disabled>
            Send
          </button>
        </div>
      </footer>
    </section>
  );
}

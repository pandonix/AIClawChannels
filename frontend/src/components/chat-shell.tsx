import type { ChatMessage, SessionSummary } from "@contracts";

import type { ChatStreamState } from "../hooks/use-chat-stream";

interface ChatShellProps {
  session: SessionSummary | null;
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  historyErrorMessage: string | null;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  isSendingMessage: boolean;
  activeRunId: string | null;
  runStateLabel: string | null;
  onAbortRun: () => void;
  isAbortingRun: boolean;
  streamState: ChatStreamState;
  onOpenSettings: () => void;
}

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
  messages,
  isLoadingHistory,
  historyErrorMessage,
  composerValue,
  onComposerChange,
  onSendMessage,
  isSendingMessage,
  activeRunId,
  runStateLabel,
  onAbortRun,
  isAbortingRun,
  streamState,
  onOpenSettings
}: ChatShellProps) {
  const hasMessages = messages.length > 0;

  return (
    <section className="chat-shell">
      <header className="chat-header">
        <div className="chat-header__title-block">
          <p className="chat-header__eyebrow">Workspace</p>
          <h2>{session?.title ?? "Select a session"}</h2>
        </div>
        <div className="chat-header__status">
          <span className={`status-pill${streamState.connectionState === "open" ? "" : " status-pill--muted"}`}>
            SSE {streamState.connectionState}
          </span>
          {streamState.streamError ? (
            <span className="status-pill status-pill--error">{streamState.streamError}</span>
          ) : null}
          <button
            type="button"
            className="icon-button icon-button--settings"
            onClick={onOpenSettings}
            title="Session Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="message-stage">
        <div className="message-stage__rail">
          <span>Timeline</span>
          <span>{streamState.agentEvents.length} events</span>
          {runStateLabel ? <span className="message-stage__status">{runStateLabel}</span> : null}
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
            <span className="empty-hint">Waiting for agent events</span>
          )}
        </div>
        <div className="message-stage__list">
          {!session ? <p className="empty-state">Select a session to start chatting.</p> : null}
          {session && isLoadingHistory && !hasMessages ? (
            <p className="empty-state">Loading history...</p>
          ) : null}
          {session && historyErrorMessage ? (
            <p className="empty-state empty-state--error">{historyErrorMessage}</p>
          ) : null}
          {session && !isLoadingHistory && !historyErrorMessage && !hasMessages ? (
            <p className="empty-state">No messages yet. Start the conversation below.</p>
          ) : null}
          {messages.map((message) => (
            <article key={message.id} className={`message-card message-card--${message.role}`}>
              <div className="message-card__meta">
                <span>{roleLabel(message.role === "assistant" ? "assistant" : "user")}</span>
                <span>{formatStreamStamp(message.createdAt)}</span>
              </div>
              <p>{message.text}</p>
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
          {activeRunId && !streamState.streamingRuns.some((run) => run.runId === activeRunId) ? (
            <article className="message-card message-card--assistant message-card--pending">
              <div className="message-card__meta">
                <span>Assistant</span>
                <span>{activeRunId}</span>
              </div>
              <p>Waiting for the first streaming delta...</p>
            </article>
          ) : null}
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
        <textarea
          className="composer-shell__input"
          rows={4}
          placeholder={session ? "Type a message..." : "Select a session to start chatting."}
          disabled={!session || Boolean(activeRunId)}
          value={composerValue}
          onChange={(event) => onComposerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSendMessage();
            }
          }}
        />
        <div className="composer-shell__actions">
          <button
            type="button"
            className="ghost-button ghost-button--light"
            onClick={onAbortRun}
            disabled={!activeRunId || isAbortingRun}
          >
            {isAbortingRun ? "Stopping..." : "Stop"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onSendMessage}
            disabled={!session || isSendingMessage || Boolean(activeRunId) || !composerValue.trim()}
          >
            {isSendingMessage ? "Sending..." : "Send"}
          </button>
        </div>
      </footer>
    </section>
  );
}

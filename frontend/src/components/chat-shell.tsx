import type { ChatMessage, SessionSummary } from "@contracts";

interface ChatShellProps {
  session: SessionSummary | null;
  titleDraft: string;
  onTitleDraftChange: (value: string) => void;
  onRenameSession: () => void;
  isRenamingSession: boolean;
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
}

function roleLabel(role: "user" | "assistant"): string {
  return role === "user" ? "User" : "Assistant";
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ChatShell({
  session,
  titleDraft,
  onTitleDraftChange,
  onRenameSession,
  isRenamingSession,
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
  isAbortingRun
}: ChatShellProps) {
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
          <span className="status-pill status-pill--muted">SSE pending</span>
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
          <span>{session ? `${messages.length} messages` : "No session selected"}</span>
          {runStateLabel ? <span className="message-stage__status">{runStateLabel}</span> : null}
        </div>
        <div className="message-stage__list">
          {!session ? <p className="empty-state">Select a session to inspect chat history.</p> : null}
          {session && isLoadingHistory ? <p className="empty-state">Loading history...</p> : null}
          {session && historyErrorMessage ? (
            <p className="empty-state empty-state--error">{historyErrorMessage}</p>
          ) : null}
          {session && !isLoadingHistory && !historyErrorMessage && !messages.length ? (
            <p className="empty-state">No messages yet. Start the conversation from the composer.</p>
          ) : null}
          {messages.map((message) => (
            <article key={message.id} className={`message-card message-card--${message.role}`}>
              <div className="message-card__meta">
                <span>{roleLabel(message.role === "assistant" ? "assistant" : "user")}</span>
                <span>{formatMessageTime(message.createdAt)}</span>
              </div>
              <p>{message.text}</p>
            </article>
          ))}
          {activeRunId ? (
            <article className="message-card message-card--assistant message-card--pending">
              <div className="message-card__meta">
                <span>Assistant</span>
                <span>running</span>
              </div>
              <p>Waiting for the current run to produce the next assistant message.</p>
            </article>
          ) : null}
        </div>
      </section>

      <footer className="composer-shell">
        <div className="composer-shell__header">
          <div>
            <p className="chat-header__eyebrow">Composer</p>
            <h3>Message composer</h3>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={onAbortRun}
            disabled={!activeRunId || isAbortingRun}
          >
            {isAbortingRun ? "Stopping..." : "Stop"}
          </button>
        </div>
        <textarea
          className="composer-shell__input"
          rows={5}
          placeholder="Type a message for the current session."
          disabled={!session || Boolean(activeRunId)}
          value={composerValue}
          onChange={(event) => onComposerChange(event.target.value)}
        />
        <div className="composer-shell__actions">
          <span>
            {activeRunId
              ? `Run ${activeRunId} is active. Use stop to abort the current response.`
              : "Contract ready: `POST /api/chat/send` + `POST /api/chat/abort`"}
          </span>
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

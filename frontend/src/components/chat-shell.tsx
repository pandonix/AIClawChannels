import type { SessionSummary } from "@contracts";

interface ChatShellProps {
  session: SessionSummary | null;
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

export function ChatShell({ session }: ChatShellProps) {
  return (
    <section className="chat-shell">
      <header className="chat-header">
        <div>
          <p className="chat-header__eyebrow">Workspace</p>
          <h2>{session?.title ?? "Select a session"}</h2>
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
          <span>History hook reserved</span>
        </div>
        <div className="message-stage__list">
          {skeletonMessages.map((message) => (
            <article key={message.id} className={`message-card message-card--${message.role}`}>
              <div className="message-card__meta">
                <span>{roleLabel(message.role)}</span>
                <span>{message.title}</span>
              </div>
              <p>{message.body}</p>
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
          <span>Contract ready: `POST /api/chat/send` + `POST /api/chat/abort`</span>
          <button type="button" className="primary-button" disabled>
            Send
          </button>
        </div>
      </footer>
    </section>
  );
}

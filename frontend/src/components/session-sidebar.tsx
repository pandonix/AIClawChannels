import type { SessionSummary } from "@contracts";

interface SessionSidebarProps {
  isLoading: boolean;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
  errorMessage: string | null;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function SessionSidebar({
  isLoading,
  sessions,
  selectedSessionId,
  onSelectSession,
  onRefresh,
  errorMessage
}: SessionSidebarProps) {
  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-brand">
        <p className="sidebar-kicker">AIClawChannels</p>
        <h1>Operator Desk</h1>
        <p className="sidebar-copy">
          Shell for sessions, messages, and streaming status. Business actions land here in the next
          frontend tracks.
        </p>
      </div>

      <div className="sidebar-toolbar">
        <button type="button" className="primary-button">
          New Session
        </button>
        <button type="button" className="ghost-button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <section className="sidebar-section">
        <div className="section-heading">
          <span>Sessions</span>
          <span>{sessions.length}</span>
        </div>
        {isLoading ? <p className="sidebar-state">Loading sessions...</p> : null}
        {errorMessage ? <p className="sidebar-state error-text">{errorMessage}</p> : null}
        {!isLoading && !errorMessage ? (
          <ul className="session-stack">
            {sessions.map((session) => {
              const isActive = session.id === selectedSessionId;

              return (
                <li key={session.id}>
                  <button
                    type="button"
                    className={`session-card${isActive ? " active" : ""}`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <span className="session-card__title">{session.title}</span>
                    <span className="session-card__meta">
                      {session.agentId ?? "default agent"} . {formatTimestamp(session.updatedAt)}
                    </span>
                    <span className="session-card__preview">
                      {session.lastMessagePreview ?? "This session has no messages yet."}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="sidebar-section sidebar-section--footer">
        <div className="section-heading">
          <span>Track</span>
          <span>T1.D1</span>
        </div>
        <p className="sidebar-copy">
          Current scope: layout, navigation shell, and state slots for chat history and composer.
        </p>
      </section>
    </aside>
  );
}

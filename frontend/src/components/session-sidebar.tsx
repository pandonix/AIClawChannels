import type { SessionSummary } from "@contracts";

interface SessionSidebarProps {
  isLoading: boolean;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
  errorMessage: string | null;
  newSessionName: string;
  onNewSessionNameChange: (value: string) => void;
  onCreateSession: () => void;
  isCreatingSession: boolean;
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
  errorMessage,
  newSessionName,
  onNewSessionNameChange,
  onCreateSession,
  isCreatingSession
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
        <div className="toolbar-form">
          <label className="toolbar-form__label" htmlFor="new-session-name">
            New session
          </label>
          <input
            id="new-session-name"
            className="text-input text-input--dark"
            type="text"
            value={newSessionName}
            placeholder="会话标题"
            onChange={(event) => onNewSessionNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateSession();
              }
            }}
          />
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onCreateSession}
          disabled={isCreatingSession || !newSessionName.trim()}
        >
          {isCreatingSession ? "Creating..." : "New Session"}
        </button>
        <button type="button" className="ghost-button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <section className="sidebar-section sidebar-section--sessions">
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
          <span>T1.D2</span>
        </div>
        <p className="sidebar-copy">
          Current scope: session list, create session, rename title, and current session switching.
        </p>
      </section>
    </aside>
  );
}

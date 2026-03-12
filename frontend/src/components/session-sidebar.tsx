import type { SessionSummary } from "@contracts";

interface SessionSidebarProps {
  errorMessage: string | null;
  isCreatingSession: boolean;
  isLoading: boolean;
  isOpen: boolean;
  newSessionName: string;
  onClose: () => void;
  onCreateSession: () => void;
  onNewSessionNameChange: (value: string) => void;
  onRefresh: () => void;
  onSelectSession: (sessionId: string) => void;
  selectedSessionId: string | null;
  sessions: SessionSummary[];
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
  errorMessage,
  isCreatingSession,
  isLoading,
  isOpen,
  newSessionName,
  onClose,
  onCreateSession,
  onNewSessionNameChange,
  onRefresh,
  onSelectSession,
  selectedSessionId,
  sessions
}: SessionSidebarProps) {
  return (
    <aside className={`history-panel${isOpen ? " history-panel--open" : ""}`}>
      <div className="history-panel__header">
        <div>
          <p className="panel-kicker">History</p>
          <h2>Sessions</h2>
        </div>
        <button
          type="button"
          className="icon-button icon-button--ghost"
          onClick={onClose}
          aria-label="Close history"
        >
          x
        </button>
      </div>

      <div className="history-panel__actions">
        <label className="field-stack" htmlFor="new-session-name">
          <span className="field-label">New chat</span>
          <input
            id="new-session-name"
            className="text-input text-input--dark"
            type="text"
            value={newSessionName}
            placeholder="Session title"
            onChange={(event) => onNewSessionNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateSession();
              }
            }}
          />
        </label>
        <div className="history-panel__button-row">
          <button
            type="button"
            className="primary-button"
            onClick={onCreateSession}
            disabled={isCreatingSession}
          >
            {isCreatingSession ? "Creating..." : "Create"}
          </button>
          <button type="button" className="ghost-button ghost-button--dark" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="history-panel__meta">
        <span>{sessions.length} sessions</span>
        <span>Chat-first workspace</span>
      </div>

      {isLoading ? <p className="panel-state">Loading sessions...</p> : null}
      {errorMessage ? <p className="panel-state panel-state--error">{errorMessage}</p> : null}

      {!isLoading && !errorMessage ? (
        <ul className="history-list">
          {sessions.map((session) => {
            const isActive = session.id === selectedSessionId;

            return (
              <li key={session.id}>
                <button
                  type="button"
                  className={`history-card${isActive ? " history-card--active" : ""}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className="history-card__title">{session.title}</span>
                  <span className="history-card__meta">
                    {session.agentId ?? "default agent"} . {formatTimestamp(session.updatedAt)}
                  </span>
                  <span className="history-card__preview">
                    {session.lastMessagePreview ?? "No messages yet."}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}

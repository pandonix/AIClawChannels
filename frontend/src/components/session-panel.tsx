import type { SessionSummary } from "@contracts";

interface SessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
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

export function SessionPanel({
  isOpen,
  onClose,
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
}: SessionPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="session-panel">
        <div className="session-panel__header">
          <div>
            <p className="drawer-eyebrow">AIClawChannels</p>
            <h2>Sessions</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="session-panel__create">
          <input
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
          <div className="session-panel__create-actions">
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
        </div>

        <div className="session-panel__list">
          <div className="section-heading">
            <span>All Sessions</span>
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
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                    >
                      <span className="session-card__title">{session.title}</span>
                      <span className="session-card__meta">
                        {session.agentId ?? "default agent"} · {formatTimestamp(session.updatedAt)}
                      </span>
                      <span className="session-card__preview">
                        {session.lastMessagePreview ?? "No messages yet."}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </aside>
    </>
  );
}

import { useState } from "react";
import type { SessionSummary } from "@contracts";
import type { ChatStreamState } from "../hooks/use-chat-stream";

interface WorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionSummary | null;
  titleDraft: string;
  onTitleDraftChange: (value: string) => void;
  onRenameSession: () => void;
  isRenamingSession: boolean;
  streamState: ChatStreamState;
}

interface ConfigSection {
  id: string;
  title: string;
  expanded: boolean;
}

export function WorkspaceDrawer({
  isOpen,
  onClose,
  session,
  titleDraft,
  onTitleDraftChange,
  onRenameSession,
  isRenamingSession,
  streamState
}: WorkspaceDrawerProps) {
  const [sections, setSections] = useState<ConfigSection[]>([
    { id: "git", title: "Git Operations", expanded: false },
    { id: "context", title: "Context Constraints", expanded: false },
    { id: "advanced", title: "Advanced / Debug", expanded: false }
  ]);
  const [logsExpanded, setLogsExpanded] = useState(false);

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, expanded: !section.expanded } : section
      )
    );
  }

  if (!isOpen) {
    return null;
  }

  const gitSection = sections.find((s) => s.id === "git");
  const contextSection = sections.find((s) => s.id === "context");
  const advancedSection = sections.find((s) => s.id === "advanced");

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="workspace-drawer">
        <header className="drawer-header">
          <div className="drawer-header__title">
            <p className="drawer-eyebrow">Configuration</p>
            <h2>Session Settings</h2>
            <span className="drawer-status">
              {streamState.connectionState === "open" ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="drawer-header__actions">
            <button type="button" className="icon-button" title="Pin drawer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 17v5m-7-5l7-7 7 7m-7-7V3" />
              </svg>
            </button>
            <button type="button" className="icon-button" onClick={onClose} title="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <div className="drawer-body">
          {/* Basic Info Section */}
          <section className="config-card">
            <h3 className="config-card__title">Basic Information</h3>
            <div className="config-field">
              <label className="config-label" htmlFor="drawer-session-id">
                Session ID
              </label>
              <div className="config-value">
                <input
                  id="drawer-session-id"
                  className="text-input text-input--readonly"
                  type="text"
                  value={session?.id ?? "No active session"}
                  readOnly
                />
                <button type="button" className="icon-button icon-button--small" title="Copy">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="config-field">
              <label className="config-label" htmlFor="drawer-session-title">
                Session Title
              </label>
              <div className="config-value">
                <input
                  id="drawer-session-title"
                  className="text-input"
                  type="text"
                  value={titleDraft}
                  placeholder="Enter session title"
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
                  className="ghost-button ghost-button--small"
                  onClick={onRenameSession}
                  disabled={!session || isRenamingSession || !titleDraft.trim()}
                >
                  {isRenamingSession ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            <div className="config-field">
              <label className="config-label" htmlFor="drawer-agent-id">
                Agent ID
              </label>
              <input
                id="drawer-agent-id"
                className="text-input"
                type="text"
                value={session?.agentId ?? "default agent"}
                placeholder="Select agent"
                readOnly
              />
            </div>
          </section>

          {/* Git Operations Section */}
          <section className="config-card config-card--collapsible">
            <button
              type="button"
              className="config-card__header"
              onClick={() => toggleSection("git")}
            >
              <h3 className="config-card__title">Git Operations</h3>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`chevron${gitSection?.expanded ? " chevron--expanded" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {gitSection?.expanded ? (
              <div className="config-card__content">
                <div className="config-field">
                  <label className="config-label" htmlFor="git-repo">
                    Repository
                  </label>
                  <input
                    id="git-repo"
                    className="text-input"
                    type="text"
                    placeholder="e.g., owner/repo"
                  />
                </div>
                <div className="config-field">
                  <label className="config-label" htmlFor="git-branch">
                    Branch
                  </label>
                  <input
                    id="git-branch"
                    className="text-input"
                    type="text"
                    placeholder="e.g., main"
                  />
                </div>
                <div className="config-field">
                  <label className="config-label" htmlFor="git-tag-pattern">
                    Tag Pattern
                  </label>
                  <input
                    id="git-tag-pattern"
                    className="text-input"
                    type="text"
                    placeholder="e.g., v*"
                  />
                </div>
              </div>
            ) : null}
          </section>

          {/* Context Constraints Section */}
          <section className="config-card config-card--collapsible">
            <button
              type="button"
              className="config-card__header"
              onClick={() => toggleSection("context")}
            >
              <h3 className="config-card__title">Context Constraints</h3>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`chevron${contextSection?.expanded ? " chevron--expanded" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {contextSection?.expanded ? (
              <div className="config-card__content">
                <div className="config-field">
                  <label className="config-label" htmlFor="context-file-path">
                    File Path
                  </label>
                  <input
                    id="context-file-path"
                    className="text-input"
                    type="text"
                    placeholder="e.g., src/**/*.ts"
                  />
                </div>
                <div className="config-field">
                  <label className="config-label" htmlFor="context-ignore">
                    Ignore Patterns
                  </label>
                  <textarea
                    id="context-ignore"
                    className="text-input"
                    rows={3}
                    placeholder="e.g., node_modules, dist"
                  />
                </div>
              </div>
            ) : null}
          </section>

          {/* Advanced / Debug Section */}
          <section className="config-card config-card--collapsible">
            <button
              type="button"
              className="config-card__header"
              onClick={() => toggleSection("advanced")}
            >
              <h3 className="config-card__title">Advanced / Debug</h3>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`chevron${advancedSection?.expanded ? " chevron--expanded" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {advancedSection?.expanded ? (
              <div className="config-card__content">
                <div className="config-field">
                  <label className="config-label" htmlFor="ws-gateway">
                    WebSocket Gateway
                  </label>
                  <input
                    id="ws-gateway"
                    className="text-input"
                    type="text"
                    placeholder="ws://localhost:3001"
                  />
                </div>
                <div className="config-field">
                  <label className="config-switch">
                    <input type="checkbox" />
                    <span className="config-switch__slider" />
                    <span className="config-label">Mock Mode</span>
                  </label>
                </div>
              </div>
            ) : null}
          </section>

          {/* Live Logs Section */}
          <section className="live-logs">
            <button
              type="button"
              className="live-logs__header"
              onClick={() => setLogsExpanded(!logsExpanded)}
            >
              <h3 className="live-logs__title">Live Logs</h3>
              <span className="live-logs__badge">{streamState.agentEvents.length}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`chevron${logsExpanded ? " chevron--expanded" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {logsExpanded ? (
              <div className="live-logs__content">
                {streamState.agentEvents.length === 0 ? (
                  <p className="live-logs__empty">No events yet</p>
                ) : (
                  <ul className="live-logs__list">
                    {streamState.agentEvents.map((event) => (
                      <li key={`${event.runId}-${event.createdAt}`} className="log-entry">
                        <span className="log-entry__stage">{event.stage}</span>
                        <span className="log-entry__message">{event.message}</span>
                        <time className="log-entry__time">
                          {new Date(event.createdAt).toLocaleTimeString("zh-CN")}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="drawer-footer">
          <button type="button" className="ghost-button">
            Reset to Default
          </button>
          <button type="button" className="primary-button">
            Save Changes
          </button>
        </footer>
      </aside>
    </>
  );
}

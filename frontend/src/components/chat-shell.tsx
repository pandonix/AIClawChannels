import type { ChatMessage, SessionSummary } from "@contracts";

import type { ChatStreamState } from "../hooks/use-chat-stream";

interface ChatShellProps {
  activeRunId: string | null;
  composerValue: string;
  historyErrorMessage: string | null;
  isAbortingRun: boolean;
  isDrawerOpen: boolean;
  isDrawerPinned: boolean;
  isLoadingHistory: boolean;
  isRenamingSession: boolean;
  isSendingMessage: boolean;
  messages: ChatMessage[];
  onAbortRun: () => void;
  onComposerChange: (value: string) => void;
  onDrawerOpenChange: (open: boolean) => void;
  onDrawerPinnedChange: (pinned: boolean) => void;
  onOpenHistory: () => void;
  onRenameSession: () => void;
  onSendMessage: () => void;
  runStateLabel: string | null;
  session: SessionSummary | null;
  streamState: ChatStreamState;
  titleDraft: string;
  onTitleDraftChange: (value: string) => void;
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

function connectionLabel(state: ChatStreamState["connectionState"]): string {
  if (state === "open") {
    return "Connected / Streaming";
  }

  if (state === "connecting") {
    return "Connecting";
  }

  if (state === "reconnecting") {
    return "Reconnecting";
  }

  if (state === "error") {
    return "Stream Error";
  }

  return "Idle";
}

export function ChatShell({
  activeRunId,
  composerValue,
  historyErrorMessage,
  isAbortingRun,
  isDrawerOpen,
  isDrawerPinned,
  isLoadingHistory,
  isRenamingSession,
  isSendingMessage,
  messages,
  onAbortRun,
  onComposerChange,
  onDrawerOpenChange,
  onDrawerPinnedChange,
  onOpenHistory,
  onRenameSession,
  onSendMessage,
  runStateLabel,
  session,
  streamState,
  titleDraft,
  onTitleDraftChange
}: ChatShellProps) {
  const hasMessages = messages.length > 0;
  const liveLogItems = streamState.transportLogs.slice().reverse();

  return (
    <section
      className={
        `workspace-stage${isDrawerOpen ? " workspace-stage--drawer-open" : ""}${isDrawerPinned ? " workspace-stage--drawer-pinned" : ""}`
      }
    >
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" />
          <div>
            <p className="panel-kicker">OpenClaw</p>
            <h1>Operator Desk</h1>
          </div>
        </div>

        <div className="topbar__session">
          <button
            type="button"
            className="session-trigger"
            onClick={() => onDrawerOpenChange(true)}
            disabled={!session}
            aria-label="Open session drawer"
          >
            <span className="session-trigger__label">Session</span>
            <strong>{session?.title ?? "Select a session"}</strong>
          </button>
          <button type="button" className="icon-button" onClick={onOpenHistory} aria-label="History">
            H
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onDrawerOpenChange(!isDrawerOpen)}
            aria-label="Settings"
          >
            S
          </button>
        </div>
      </header>

      <div className="chat-stage">
        <div className="chat-stage__intro">
          <p className="panel-kicker">Workspace</p>
          <h2>{session?.title ?? "Choose a session to start"}</h2>
          <p>
            Observe AI output in the center and adjust runtime constraints from the drawer without
            leaving the conversation flow.
          </p>
        </div>

        <div className="chat-stage__status">
          <span className={`signal-pill signal-pill--${streamState.connectionState}`}>
            {connectionLabel(streamState.connectionState)}
          </span>
          {runStateLabel ? <span className="signal-pill signal-pill--muted">{runStateLabel}</span> : null}
          {streamState.streamError ? (
            <span className="signal-pill signal-pill--error">{streamState.streamError}</span>
          ) : null}
        </div>

        <div className="message-column">
          {!session ? <p className="empty-state empty-state--hero">Select a session from history.</p> : null}
          {session && isLoadingHistory && !hasMessages ? <p className="empty-state">Loading history...</p> : null}
          {session && historyErrorMessage ? (
            <p className="empty-state empty-state--error">{historyErrorMessage}</p>
          ) : null}
          {session && !isLoadingHistory && !historyErrorMessage && !hasMessages ? (
            <div className="hero-empty">
              <div className="hero-empty__icon">AI</div>
              <p>Start with a prompt. The drawer keeps session controls nearby, not in the way.</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <article key={message.id} className={`message-bubble message-bubble--${message.role}`}>
              <div className="message-bubble__meta">
                <span>{roleLabel(message.role === "assistant" ? "assistant" : "user")}</span>
                <span>{formatStreamStamp(message.createdAt)}</span>
              </div>
              <p>{message.text}</p>
            </article>
          ))}

          {streamState.streamingRuns.map((run) => (
            <article key={run.runId} className="message-bubble message-bubble--assistant message-bubble--live">
              <div className="message-bubble__meta">
                <span>Assistant</span>
                <span>Streaming {run.runId}</span>
              </div>
              <p>{run.text || "Waiting for delta..."}</p>
            </article>
          ))}

          {activeRunId && !streamState.streamingRuns.some((run) => run.runId === activeRunId) ? (
            <article className="message-bubble message-bubble--assistant message-bubble--pending">
              <div className="message-bubble__meta">
                <span>Assistant</span>
                <span>{activeRunId}</span>
              </div>
              <p>Waiting for the first streaming chunk.</p>
            </article>
          ) : null}

          {streamState.notices.map((notice) => (
            <article key={`${notice.type}-${notice.runId}-${notice.createdAt}`} className="message-bubble message-bubble--notice">
              <div className="message-bubble__meta">
                <span>{notice.type === "error" ? "Run error" : "Run aborted"}</span>
                <span>{notice.runId}</span>
              </div>
              <p>{notice.message}</p>
            </article>
          ))}
        </div>

        <footer className="composer-panel">
          <textarea
            className="composer-panel__input"
            rows={4}
            placeholder="Ask OpenClaw..."
            disabled={!session || Boolean(activeRunId)}
            value={composerValue}
            onChange={(event) => onComposerChange(event.target.value)}
          />
          <div className="composer-panel__actions">
            <div className="composer-panel__hint">
              {activeRunId
                ? `Run ${activeRunId} is active. Stop it before sending another prompt.`
                : "Message input stays centered while settings live in the drawer."}
            </div>
            <div className="composer-panel__buttons">
              <button
                type="button"
                className="ghost-button ghost-button--dark"
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
          </div>
        </footer>
      </div>

      <aside className={`workspace-drawer${isDrawerOpen ? " workspace-drawer--open" : ""}`}>
        <div className="workspace-drawer__header">
          <div>
            <p className="panel-kicker">Session</p>
            <h2>{session?.title ?? "No active session"}</h2>
            <span className={`drawer-status drawer-status--${streamState.connectionState}`}>
              {connectionLabel(streamState.connectionState)}
            </span>
          </div>
          <div className="workspace-drawer__header-actions">
            <button
              type="button"
              className={`icon-button icon-button--ghost${isDrawerPinned ? " is-active" : ""}`}
              onClick={() => onDrawerPinnedChange(!isDrawerPinned)}
              aria-label={isDrawerPinned ? "Unpin drawer" : "Pin drawer"}
            >
              pin
            </button>
            <button
              type="button"
              className="primary-button primary-button--compact"
              onClick={onRenameSession}
              disabled={!session || isRenamingSession || !titleDraft.trim()}
            >
              {isRenamingSession ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="ghost-button ghost-button--dark"
              onClick={() => {
                onTitleDraftChange(session?.title ?? "");
              }}
              disabled={!session}
            >
              Reset
            </button>
            <button
              type="button"
              className="icon-button icon-button--ghost"
              onClick={() => onDrawerOpenChange(false)}
              aria-label="Close drawer"
            >
              x
            </button>
          </div>
        </div>

        <div className="workspace-drawer__body">
          <section className="config-card">
            <div className="config-card__title-row">
              <h3>Basic Info</h3>
            </div>
            <label className="field-stack">
              <span className="field-label">Session ID</span>
              <div className="readonly-field">
                <span>{session?.id ?? "No active session"}</span>
              </div>
            </label>
            <label className="field-stack" htmlFor="session-title">
              <span className="field-label">Session Title</span>
              <input
                id="session-title"
                className="text-input text-input--drawer"
                type="text"
                value={titleDraft}
                disabled={!session}
                onChange={(event) => onTitleDraftChange(event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span className="field-label">Agent</span>
              <div className="readonly-field">
                <span>{session?.agentId ?? "[default agent (Coder)]"}</span>
              </div>
            </label>
          </section>

          <section className="config-card">
            <div className="config-card__title-row">
              <h3>Git Ops</h3>
              <span className="config-chip">Preview</span>
            </div>
            <label className="field-stack">
              <span className="field-label">Repository</span>
              <div className="readonly-field">
                <span>git@github.com:pandonix/AIClawChannels.git</span>
              </div>
            </label>
            <label className="field-stack">
              <span className="field-label">Branch</span>
              <div className="readonly-field">
                <span>{session ? "AIClawChannels-front-rebuild" : "No active session"}</span>
              </div>
            </label>
            <label className="field-stack">
              <span className="field-label">Tag Pattern</span>
              <input className="text-input text-input--drawer" type="text" value="release-*" readOnly />
            </label>
          </section>

          <section className="config-card">
            <div className="config-card__title-row">
              <h3>Context Constraints</h3>
              <span className="config-chip">Inline</span>
            </div>
            <label className="field-stack">
              <span className="field-label">Heartbeat Path</span>
              <input className="text-input text-input--drawer" type="text" value="./workspace/HEARTBEAT.md" readOnly />
            </label>
            <div className="field-stack">
              <span className="field-label">Ignore Patterns</span>
              <div className="tag-row">
                <span className="tag-chip">node_modules/</span>
                <span className="tag-chip">.git/</span>
              </div>
            </div>
          </section>

          <section className="config-card">
            <div className="config-card__title-row">
              <h3>Advanced / Debug</h3>
              <span className="config-chip">Live</span>
            </div>
            <label className="field-stack">
              <span className="field-label">Transport</span>
              <div className="readonly-field">
                <span>SSE stream</span>
              </div>
            </label>
            <label className="field-stack">
              <span className="field-label">Gateway</span>
              <div className="readonly-field">
                <span>/api/chat/stream</span>
              </div>
            </label>
            <div className="field-stack">
              <span className="field-label">Live Logs</span>
              <div className="live-log">
                {liveLogItems.length ? (
                  liveLogItems.map((entry) => (
                    <div key={entry.id} className={`live-log__row live-log__row--${entry.level}`}>
                      <span>{formatStreamStamp(entry.createdAt)}</span>
                      <strong>{entry.label}</strong>
                      <span>{entry.detail}</span>
                    </div>
                  ))
                ) : (
                  <p className="live-log__empty">No stream logs yet.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </section>
  );
}

interface NavigationRailProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  historyOpen: boolean;
}

export function NavigationRail({
  onNewChat,
  onToggleHistory,
  onOpenSettings,
  historyOpen
}: NavigationRailProps) {
  return (
    <nav className="navigation-rail">
      <button
        type="button"
        className="rail-button"
        onClick={onNewChat}
        title="New Chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        className={`rail-button${historyOpen ? " rail-button--active" : ""}`}
        onClick={onToggleHistory}
        title="History"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>
      <button
        type="button"
        className="rail-button"
        onClick={onOpenSettings}
        title="Settings"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3" />
        </svg>
      </button>
    </nav>
  );
}

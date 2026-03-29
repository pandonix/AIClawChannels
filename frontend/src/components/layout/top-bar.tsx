import type { SessionSummary } from "@contracts";
import { env } from "../../config/env";
import type { ConnectionStatus } from "../../features/workbench/workbench-state";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const connectionTone: Record<ConnectionStatus, string> = {
  closed: "border-white/10 bg-white/5 text-ink-300",
  connecting: "border-warning-400/25 bg-warning-400/10 text-warning-400",
  error: "border-danger-400/25 bg-danger-400/10 text-danger-400",
  open: "border-success-400/20 bg-success-400/10 text-success-400",
  reconnecting: "border-warning-400/25 bg-warning-400/10 text-warning-400",
};

interface TopBarProps {
  currentSession: SessionSummary | null;
  connectionStatus: ConnectionStatus;
  runId: string | null;
  onOpenSessions: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  currentSession,
  connectionStatus,
  runId,
  onOpenSessions,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-7">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={onOpenSessions}>
          Sessions
        </Button>
        <div>
          <p className="font-display text-[0.72rem] uppercase tracking-[0.34em] text-ink-300">
            {env.appName}
          </p>
          <h1 className="font-display text-2xl tracking-[-0.04em] text-ink-50 sm:text-[2.2rem]">
            {currentSession?.title ?? "No Session"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] transition ${connectionTone[connectionStatus]}`}
            >
              {connectionStatus}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px]">
            <p className="font-display text-xs uppercase tracking-[0.28em] text-ink-300">
              Connection Diagnostics
            </p>
            <dl className="mt-4 space-y-3 text-sm text-ink-200">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-300">Status</dt>
                <dd className="font-mono uppercase">{connectionStatus}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-300">Session</dt>
                <dd className="font-mono text-xs">
                  {currentSession?.id ?? "none"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-300">Run</dt>
                <dd className="font-mono text-xs">{runId ?? "none"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-300">API Base</dt>
                <dd className="font-mono text-xs">{env.apiBaseUrl}</dd>
              </div>
            </dl>
          </PopoverContent>
        </Popover>

        <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-ink-300 sm:inline-flex">
          Route Ready
        </span>

        <Button
          variant="secondary"
          onClick={onOpenSettings}
          disabled={!currentSession}
        >
          Settings
        </Button>
      </div>
    </header>
  );
}

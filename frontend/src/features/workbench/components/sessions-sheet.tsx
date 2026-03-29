import type { ResourceStatus } from "../workbench-state";
import type { SessionSummary } from "@contracts";
import { Button } from "../../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../../../components/ui/sheet";
import { cn } from "../../../lib/cn";

interface SessionsSheetProps {
  error: string | null;
  open: boolean;
  sessions: SessionSummary[];
  status: ResourceStatus;
  selectedSessionId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export function SessionsSheet({
  error,
  open,
  sessions,
  status,
  selectedSessionId,
  onOpenChange,
  onCreateSession,
  onSelectSession,
}: SessionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left">
        <div className="flex items-start justify-between gap-4 pr-14">
          <div>
            <SheetTitle className="font-display text-2xl tracking-[-0.04em] text-ink-50">
              Sessions Drawer
            </SheetTitle>
            <SheetDescription className="mt-2 text-sm leading-7 text-ink-200">
              左侧抽屉只承载会话管理，不与主聊天画布争抢常驻空间。
            </SheetDescription>
          </div>
          <Button variant="secondary" onClick={onCreateSession}>
            New
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {status === "loading" ? (
            <div className="rounded-[24px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-ink-200">
              正在读取会话列表...
            </div>
          ) : null}

          {status === "error" && error ? (
            <div className="rounded-[24px] border border-danger-400/20 bg-danger-400/8 px-4 py-4 text-sm text-danger-400">
              {error}
            </div>
          ) : null}

          {sessions.map((session) => {
            const selected = session.id === selectedSessionId;

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "block w-full rounded-[24px] border px-4 py-4 text-left transition",
                  selected
                    ? "border-accent-300/30 bg-accent-400/10"
                    : "border-white/10 bg-black/15 hover:border-white/20",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-ink-100">{session.title}</p>
                  <span className="font-mono text-[11px] text-ink-300">
                    {new Intl.DateTimeFormat("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(session.updatedAt))}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-300">
                  {session.lastMessagePreview}
                </p>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

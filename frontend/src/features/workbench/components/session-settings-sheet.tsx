import type { SessionSummary } from "@contracts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../../../components/ui/sheet";

interface SessionSettingsSheetProps {
  open: boolean;
  session: SessionSummary;
  onOpenChange: (open: boolean) => void;
}

export function SessionSettingsSheet({
  open,
  session,
  onOpenChange,
}: SessionSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetTitle className="font-display text-2xl tracking-[-0.04em] text-ink-50">
          Session Settings
        </SheetTitle>
        <SheetDescription className="mt-2 text-sm leading-7 text-ink-200">
          右侧抽屉已经落位，后续会在 M3 接入标题与 `agentId` 的真实 patch 流程。
        </SheetDescription>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.28em] text-ink-300">
              Title
            </span>
            <input
              readOnly
              value={session.title}
              className="w-full rounded-[20px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-100 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.28em] text-ink-300">
              Agent ID
            </span>
            <input
              readOnly
              value={session.agentId ?? "null"}
              className="w-full rounded-[20px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-100 outline-none"
            />
          </label>

          <dl className="rounded-[24px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-ink-200">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">Session ID</dt>
              <dd className="font-mono text-xs">{session.id}</dd>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <dt className="text-ink-300">Updated</dt>
              <dd className="font-mono text-xs">{session.updatedAt}</dd>
            </div>
          </dl>
        </div>
      </SheetContent>
    </Sheet>
  );
}

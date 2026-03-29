import { useEffect, useState } from "react";
import type { PatchSessionRequest, SessionSummary } from "@contracts";
import { Button } from "../../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../../../components/ui/sheet";

interface SessionSettingsSheetProps {
  open: boolean;
  session: SessionSummary | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: PatchSessionRequest) => Promise<void>;
}

export function SessionSettingsSheet({
  open,
  session,
  onOpenChange,
  onSave,
}: SessionSettingsSheetProps) {
  const [title, setTitle] = useState("");
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTitle(session?.title ?? "");
    setAgentId(session?.agentId ?? "");
    setError(null);
  }, [session]);

  const handleSave = async () => {
    if (!session) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        agentId: agentId.trim() ? agentId.trim() : null,
        title: title.trim() || session.title,
      });
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "patch session failed");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-[20px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-100 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.28em] text-ink-300">
              Agent ID
            </span>
            <input
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              placeholder="empty maps to null"
              className="w-full rounded-[20px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-100 outline-none"
            />
          </label>

          {error ? (
            <p className="rounded-[20px] border border-danger-400/20 bg-danger-400/8 px-4 py-3 text-sm text-danger-400">
              {error}
            </p>
          ) : null}

          <dl className="rounded-[24px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-ink-200">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-300">Session ID</dt>
              <dd className="font-mono text-xs">{session?.id ?? "none"}</dd>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <dt className="text-ink-300">Updated</dt>
              <dd className="font-mono text-xs">{session?.updatedAt ?? "n/a"}</dd>
            </div>
          </dl>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!session || isSubmitting}
            >
              {isSubmitting ? "Saving" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

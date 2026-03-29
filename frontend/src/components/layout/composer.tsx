import type { ChangeEvent } from "react";
import { Button } from "../ui/button";

interface ComposerProps {
  draft: string;
  canSend: boolean;
  canStop: boolean;
  onDraftChange: (value: string) => void;
}

export function Composer({
  draft,
  canSend,
  canStop,
  onDraftChange,
}: ComposerProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onDraftChange(event.target.value);
  };

  return (
    <div className="border-t border-white/8 px-5 pb-5 pt-4">
      <div className="mx-auto flex max-w-[980px] flex-col gap-4">
        <div className="grid gap-3 rounded-[30px] border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block">
            <span className="mb-3 block font-display text-xs uppercase tracking-[0.3em] text-ink-300">
              Composer
            </span>
            <textarea
              className="min-h-28 w-full resize-none rounded-[22px] border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 text-ink-100 outline-none placeholder:text-ink-300/70"
              value={draft}
              onChange={handleChange}
              placeholder="M4 将在这里接入真实 send / abort 交互。"
              aria-label="Composer draft"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button variant="warning" disabled={!canStop}>
              Stop
            </Button>
            <Button disabled={!canSend}>Send</Button>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/8 bg-canvas-900/60 px-4 py-4">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-ink-300">
            Interaction Status
          </p>
          <p className="mt-3 text-sm leading-7 text-ink-200">
            当前只开放可编辑草稿与 UI 骨架，不制造“按钮已可用但后端未接通”的假象。实际发送、停止与流式收敛会在 M4 对齐 contract 后启用。
          </p>
        </div>
      </div>
    </div>
  );
}

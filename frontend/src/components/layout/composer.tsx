import type { ChangeEvent, KeyboardEvent } from "react";
import type { ActiveRunStatus } from "../../features/workbench/workbench-state";
import { Button } from "../ui/button";

interface ComposerProps {
  activeRunStatus: ActiveRunStatus;
  draft: string;
  canSend: boolean;
  canStop: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}

export function Composer({
  activeRunStatus,
  draft,
  canSend,
  canStop,
  onDraftChange,
  onSend,
  onStop,
}: ComposerProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onDraftChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && canSend) {
      event.preventDefault();
      onSend();
    }
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
              aria-describedby="composer-hint"
              className="min-h-28 w-full resize-none rounded-[22px] border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 text-ink-100 outline-none placeholder:text-ink-300/70"
              value={draft}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，使用 Ctrl/Cmd + Enter 发送。"
              aria-label="Composer draft"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button variant="warning" disabled={!canStop} onClick={onStop}>
              Stop
            </Button>
            <Button disabled={!canSend} onClick={onSend}>
              Send
            </Button>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/8 bg-canvas-900/60 px-4 py-4">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-ink-300">
            Interaction Status
          </p>
          <p id="composer-hint" className="mt-3 text-sm leading-7 text-ink-200">
            当前 run 状态为 <span className="font-mono uppercase">{activeRunStatus}</span>。
            发送、停止和流式收敛已经接入 contract；若 SSE 或 run 失败，错误会以局部 notice 形式留在消息流里。
          </p>
        </div>
      </div>
    </div>
  );
}

import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSessionDialog({
  open,
  onOpenChange,
}: NewSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="font-display text-2xl tracking-[-0.04em] text-ink-50">
          New Session
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-7 text-ink-200">
          Dialog 原语已经就位。实际创建流程会在 M3 接入 `POST /api/sessions`。
        </DialogDescription>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.28em] text-ink-300">
              Session Name
            </span>
            <input
              className="w-full rounded-[20px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-100 outline-none"
              placeholder="M3 will wire session creation"
              disabled
            />
          </label>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

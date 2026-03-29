import { useState } from "react";
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
  onCreateSession: (name: string) => Promise<void>;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onCreateSession,
}: NewSessionDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreateSession(name.trim());
      setName("");
      onOpenChange(false);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "create session failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="font-display text-2xl tracking-[-0.04em] text-ink-50">
          New Session
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-7 text-ink-200">
          通过 `POST /api/sessions` 创建会话，创建成功后会立即切换到新会话并重建历史 / SSE。
        </DialogDescription>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.28em] text-ink-300">
              Session Name
            </span>
            <input
              className="w-full rounded-[20px] border border-white/10 bg-black/15 px-4 py-3 text-sm text-ink-100 outline-none"
              placeholder="新的会话"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {error ? (
            <p className="rounded-[20px] border border-danger-400/20 bg-danger-400/8 px-4 py-3 text-sm text-danger-400">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={isSubmitting}>
              {isSubmitting ? "Creating" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

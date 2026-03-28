import { cn } from "../../lib/cn";

interface StreamingCursorProps {
  className?: string;
}

export function StreamingCursor({ className }: StreamingCursorProps) {
  return <span aria-hidden="true" className={cn("streaming-cursor", className)} />;
}

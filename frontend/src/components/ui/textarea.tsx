import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type TextareaTone = "light" | "dark";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: TextareaTone;
}

const toneClasses: Record<TextareaTone, string> = {
  light:
    "border-[#1f262f]/10 bg-white/84 text-[#1f262f] placeholder:text-[#1f262f]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  dark:
    "border-white/12 bg-white/8 text-[#fffaf4] placeholder:text-[#f7f3ec]/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, tone = "light", ...props },
  ref
) {
  return (
    <textarea
      className={cn(
        "w-full min-w-0 rounded-[22px] border px-4 py-3 text-sm transition-[border-color,background-color,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-55",
        toneClasses[tone],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

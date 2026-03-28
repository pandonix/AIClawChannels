import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type InputTone = "light" | "dark";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  tone?: InputTone;
}

const toneClasses: Record<InputTone, string> = {
  light:
    "border-[#1f262f]/10 bg-white/84 text-[#1f262f] placeholder:text-[#1f262f]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  dark:
    "border-white/12 bg-white/8 text-[#fffaf4] placeholder:text-[#f7f3ec]/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, tone = "light", ...props },
  ref
) {
  return (
    <input
      className={cn(
        "w-full min-w-0 rounded-[18px] border px-4 py-3 text-sm transition-[border-color,background-color,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-55",
        toneClasses[tone],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

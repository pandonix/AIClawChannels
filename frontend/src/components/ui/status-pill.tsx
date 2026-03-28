import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type StatusTone = "accent" | "muted" | "error" | "teal";

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

const toneClasses: Record<StatusTone, string> = {
  accent: "border-[#c45a2c]/16 bg-[#c45a2c]/10 text-[#8b3211]",
  muted: "border-[#1f262f]/10 bg-[#1f262f]/5 text-[#4f5d68]",
  error: "border-[#9a2816]/16 bg-[#9a2816]/10 text-[#9a2816]",
  teal: "border-[#13586d]/16 bg-[#13586d]/10 text-[#13586d]"
};

export function StatusPill({ className, tone = "accent", ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

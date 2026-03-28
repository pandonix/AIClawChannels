import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/cn";

type PanelTone = "soft" | "elevated" | "muted" | "dark";
type PanelPadding = "none" | "sm" | "md" | "lg";

interface PanelProps extends ComponentPropsWithoutRef<"div"> {
  padding?: PanelPadding;
  tone?: PanelTone;
}

const toneClasses: Record<PanelTone, string> = {
  soft:
    "border-white/58 bg-[rgba(255,250,243,0.76)] text-[#1f262f] shadow-[0_22px_48px_rgba(31,38,47,0.08)] backdrop-blur-[18px]",
  elevated:
    "border-white/74 bg-[rgba(255,252,248,0.92)] text-[#1f262f] shadow-[0_26px_54px_rgba(31,38,47,0.11)] backdrop-blur-[18px]",
  muted:
    "border-[#1f262f]/8 bg-[rgba(246,239,231,0.78)] text-[#1f262f] shadow-[0_16px_28px_rgba(31,38,47,0.06)] backdrop-blur-[12px]",
  dark:
    "border-white/10 bg-[linear-gradient(180deg,rgba(31,38,47,0.98)_0%,rgba(38,47,59,0.94)_100%)] text-[#fffaf4] shadow-[0_30px_70px_rgba(16,24,31,0.42)] backdrop-blur-[24px]"
};

const paddingClasses: Record<PanelPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6"
};

export function Panel({ className, padding = "md", tone = "soft", ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border motion-safe:transition-[background-color,border-color,box-shadow,transform] motion-safe:duration-200",
        toneClasses[tone],
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  );
}

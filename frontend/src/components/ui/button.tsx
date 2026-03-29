import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "warning";

const buttonTone: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-300 text-canvas-950 hover:bg-white disabled:bg-accent-300/40 disabled:text-canvas-950/70",
  secondary:
    "border border-white/10 bg-white/5 text-ink-200 hover:border-accent-300/45 hover:text-ink-50 disabled:border-white/8 disabled:text-ink-300/60",
  warning:
    "border border-warning-400/30 bg-warning-400/10 text-warning-400 hover:border-warning-400/60 disabled:border-warning-400/12 disabled:text-warning-400/45",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed",
        buttonTone[variant],
        className,
      )}
      {...props}
    />
  );
}

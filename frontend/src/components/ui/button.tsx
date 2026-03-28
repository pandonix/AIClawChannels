import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "contrast" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[linear-gradient(135deg,#db6f3f_0%,#b04216_100%)] text-[#fffaf4] shadow-[0_20px_38px_rgba(176,66,22,0.24)] hover:bg-[linear-gradient(135deg,#e57d4e_0%,#982f08_100%)] disabled:bg-[#1f262f]/12 disabled:text-[#1f262f]/32 disabled:shadow-none disabled:bg-none",
  secondary:
    "border-[#1f262f]/10 bg-white/78 text-[#1f262f] shadow-[0_16px_30px_rgba(31,38,47,0.08)] hover:border-[#1f262f]/18 hover:bg-white/96 disabled:bg-[#1f262f]/4 disabled:text-[#1f262f]/28 disabled:shadow-none",
  ghost:
    "border-[#1f262f]/12 bg-transparent text-[#30404c] hover:border-[#1f262f]/18 hover:bg-[#1f262f]/4 disabled:text-[#1f262f]/24 disabled:border-transparent",
  contrast:
    "border-white/10 bg-white/8 text-[#fffaf4] hover:border-white/20 hover:bg-white/12 disabled:bg-white/4 disabled:text-white/22 disabled:border-white/6",
  danger:
    "border-transparent bg-[#9a2816] text-[#fff6f2] shadow-[0_18px_34px_rgba(154,40,22,0.22)] hover:bg-[#7f2112] disabled:bg-[#1f262f]/12 disabled:text-[#1f262f]/32 disabled:shadow-none"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 rounded-full px-4 text-sm",
  md: "h-11 rounded-full px-5 text-sm",
  lg: "h-12 rounded-full px-6 text-sm",
  icon: "size-11 rounded-[18px] p-0"
};

export function Button({
  children,
  className,
  disabled,
  leadingIcon,
  size = "md",
  trailingIcon,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-medium tracking-[0.02em] transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={disabled}
      type={type}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

interface IconButtonProps extends ButtonProps {
  "aria-label": string;
}

export function IconButton({ children, className, size = "icon", ...props }: IconButtonProps) {
  return (
    <Button className={cn("shrink-0", className)} size={size} {...props}>
      {children}
    </Button>
  );
}

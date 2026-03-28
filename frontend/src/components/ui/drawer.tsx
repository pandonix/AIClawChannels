import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../../lib/cn";

type DrawerSide = "left" | "right";

interface DrawerProps extends Omit<ComponentPropsWithoutRef<"aside">, "children"> {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  overlayClassName?: string;
  side?: DrawerSide;
}

export function Drawer({
  children,
  className,
  isOpen,
  onClose,
  overlayClassName,
  side = "right",
  ...props
}: DrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-[#1f262f]/34 backdrop-blur-[2px]",
          overlayClassName
        )}
        onClick={onClose}
      />
      <aside
        aria-modal="true"
        className={cn(
          "fixed top-3 bottom-3 z-50 flex w-[min(92vw,30rem)] flex-col overflow-hidden rounded-[30px] border shadow-[0_36px_100px_rgba(16,24,31,0.35)]",
          side === "left" ? "left-3" : "right-3",
          className
        )}
        role="dialog"
        {...props}
      >
        {children}
      </aside>
    </>
  );
}

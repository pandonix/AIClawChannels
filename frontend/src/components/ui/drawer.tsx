import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-[#1f262f]/34 backdrop-blur-[2px] transition-opacity duration-250 motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
          overlayClassName
        )}
        onClick={onClose}
      />
      <aside
        aria-modal="true"
        className={cn(
          "fixed top-3 bottom-3 z-50 flex w-[min(92vw,30rem)] flex-col overflow-hidden rounded-[30px] border shadow-[0_36px_100px_rgba(16,24,31,0.35)] transition-transform duration-250 ease-out motion-reduce:transition-none",
          side === "left" ? "left-3" : "right-3",
          side === "left"
            ? (visible ? "translate-x-0" : "-translate-x-[calc(100%+12px)]")
            : (visible ? "translate-x-0" : "translate-x-[calc(100%+12px)]"),
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

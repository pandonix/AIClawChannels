import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/cn";

interface SkeletonProps extends ComponentPropsWithoutRef<"div"> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[22px] bg-[linear-gradient(90deg,rgba(31,38,47,0.06)_0%,rgba(31,38,47,0.12)_50%,rgba(31,38,47,0.06)_100%)] bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

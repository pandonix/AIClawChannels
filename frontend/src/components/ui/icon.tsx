import type { ComponentPropsWithoutRef } from "react";

type IconName =
  | "plus"
  | "history"
  | "settings"
  | "close"
  | "copy"
  | "chevronDown"
  | "arrowDown";

interface IconProps extends Omit<ComponentPropsWithoutRef<"svg">, "children"> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  className,
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {name === "plus" ? (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      ) : null}
      {name === "history" ? (
        <>
          <path d="M3 12a9 9 0 1 0 3.16-6.88" />
          <path d="M3 4v4h4" />
          <path d="M12 7v5l3 2" />
        </>
      ) : null}
      {name === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      ) : null}
      {name === "close" ? (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      ) : null}
      {name === "copy" ? (
        <>
          <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      ) : null}
      {name === "chevronDown" ? <path d="m6 9 6 6 6-6" /> : null}
      {name === "arrowDown" ? <path d="m12 5 0 14m-6-6 6 6 6-6" /> : null}
    </svg>
  );
}

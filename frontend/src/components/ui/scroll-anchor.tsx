import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, RefObject } from "react";

import { Button } from "./button";
import { Icon } from "./icon";

interface UseScrollAnchorOptions {
  containerRef: RefObject<HTMLElement | null>;
  isEnabled: boolean;
  pauseThreshold?: number;
  streaming?: boolean;
  watchToken?: string | number | null;
}

export function useScrollAnchor({
  containerRef,
  isEnabled,
  pauseThreshold = 88,
  streaming = false,
  watchToken
}: UseScrollAnchorOptions) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    if (!isEnabled) {
      setIsFollowing(true);
      return;
    }

    if (!isFollowing) {
      return;
    }

    anchorRef.current?.scrollIntoView({
      block: "end",
      behavior: streaming ? "auto" : "smooth"
    });
  }, [isEnabled, isFollowing, streaming, watchToken]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsFollowing(distanceToBottom < pauseThreshold);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    setIsFollowing(true);
    anchorRef.current?.scrollIntoView({
      block: "end",
      behavior
    });
  }

  return {
    anchorRef,
    handleScroll,
    isFollowing,
    scrollToBottom
  };
}

interface ScrollAnchorProps {
  children?: ReactNode;
}

export function ScrollAnchor({ children }: ScrollAnchorProps) {
  return <>{children}</>;
}

interface ScrollToBottomButtonProps {
  className?: string;
  onClick: () => void;
}

export function ScrollToBottomButton({
  className,
  onClick,
  ...props
}: ScrollToBottomButtonProps &
  Omit<ComponentPropsWithoutRef<typeof Button>, "children" | "leadingIcon" | "onClick" | "size" | "variant">) {
  return (
    <Button
      className={className}
      onClick={onClick}
      leadingIcon={<Icon name="arrowDown" size={16} />}
      size="sm"
      variant="secondary"
      {...props}
    >
      回到底部
    </Button>
  );
}

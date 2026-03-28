import { useEffect, useRef, useState } from "react";
import type { ChatMessage, SessionSummary } from "@contracts";

import { cn } from "../lib/cn";
import type { ChatStreamState } from "../hooks/use-chat-stream";
import { Button, IconButton } from "./ui/button";
import { Icon } from "./ui/icon";
import { MarkdownRenderer } from "./ui/markdown-renderer";
import { Panel } from "./ui/panel";
import { Skeleton } from "./ui/skeleton";
import {
  ScrollAnchor,
  ScrollToBottomButton,
  useScrollAnchor
} from "./ui/scroll-anchor";
import { StatusPill } from "./ui/status-pill";
import { Textarea } from "./ui/textarea";

interface ChatShellProps {
  session: SessionSummary | null;
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  historyErrorMessage: string | null;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  isSendingMessage: boolean;
  activeRunId: string | null;
  runStateLabel: string | null;
  onAbortRun: () => void;
  isAbortingRun: boolean;
  streamState: ChatStreamState;
  onOpenSettings: () => void;
}

function roleLabel(role: "user" | "assistant"): string {
  return role === "user" ? "你" : "AI 助手";
}

function formatStreamStamp(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function connectionLabel(state: ChatStreamState["connectionState"]): string {
  switch (state) {
    case "open":
      return "SSE 已连接";
    case "connecting":
      return "SSE 连接中";
    case "reconnecting":
      return "SSE 重连中";
    case "error":
      return "SSE 异常";
    default:
      return "SSE 待连接";
  }
}

function connectionTone(state: ChatStreamState["connectionState"]): "teal" | "muted" | "error" {
  if (state === "open") {
    return "teal";
  }

  if (state === "error") {
    return "error";
  }

  return "muted";
}

export function ChatShell({
  session,
  messages,
  isLoadingHistory,
  historyErrorMessage,
  composerValue,
  onComposerChange,
  onSendMessage,
  isSendingMessage,
  activeRunId,
  runStateLabel,
  onAbortRun,
  isAbortingRun,
  streamState,
  onOpenSettings
}: ChatShellProps) {
  const hasMessages = messages.length > 0;
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const hasTimelineContent =
    streamState.agentEvents.length > 0 || Boolean(runStateLabel) || Boolean(activeRunId);
  const hasPendingRunWithoutDelta =
    Boolean(activeRunId) &&
    !streamState.streamingRuns.some((run) => run.runId === activeRunId);
  const scrollWatchToken = [
    activeRunId ?? "idle",
    messages.at(-1)?.id ?? "none",
    streamState.streamingRuns
      .map((run) => `${run.runId}:${run.text.length}`)
      .join("|"),
    streamState.notices
      .map((notice) => `${notice.type}:${notice.runId}:${notice.createdAt}`)
      .join("|"),
    historyErrorMessage ?? "no-error",
    isLoadingHistory ? "loading" : "ready"
  ].join("::");
  const {
    anchorRef,
    handleScroll,
    isFollowing,
    scrollToBottom
  } = useScrollAnchor({
    containerRef: listRef,
    isEnabled: Boolean(session),
    streaming: streamState.streamingRuns.length > 0,
    watchToken: scrollWatchToken
  });

  useEffect(() => {
    if (hasTimelineContent) {
      setTimelineOpen(true);
    }
  }, [hasTimelineContent]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 224)}px`;
  }, [composerValue, composerFocused]);

  return (
    <section
      className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-3 md:p-3"
      data-testid="chat-shell"
    >
      <Panel
        padding="none"
        tone="soft"
        className="flex flex-col gap-2 border-white/65 bg-[rgba(255,250,243,0.82)] px-5 py-3 md:flex-row md:items-start md:justify-between"
      >
        <div className="space-y-2">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b3211]">
              协作工作台
            </p>
            <h2 className="font-display text-[clamp(1.6rem,3.2vw,2.35rem)] leading-none tracking-[-0.05em] text-[#1f262f]">
              <span data-testid="chat-title">
                {session?.title ?? "选择一个会话开始协作"}
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#5d6973]">
            {session
              ? "支持 Markdown、代码块和流式回复，时间线会在当前轮次有事件时自动展开。"
              : "左侧打开历史会话，或新建一个会话后，把任务、代码和修改目标直接发给 AI。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill data-testid="sse-status" tone={connectionTone(streamState.connectionState)}>
            {connectionLabel(streamState.connectionState)}
          </StatusPill>
          {streamState.streamError ? (
            <StatusPill tone="error">{streamState.streamError}</StatusPill>
          ) : null}
          <IconButton
            data-testid="chat-settings-button"
            type="button"
            onClick={onOpenSettings}
            variant="secondary"
            aria-label="打开会话设置"
            title="打开会话设置"
          >
            <Icon name="settings" size={18} />
          </IconButton>
        </div>
      </Panel>

      <section
        className={cn(
          "grid min-h-0 gap-4",
          timelineOpen && hasTimelineContent ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : "grid-cols-1"
        )}
      >
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="gap-2"
              disabled={!hasTimelineContent}
              onClick={() => setTimelineOpen((current) => !current)}
              trailingIcon={
                <Icon
                  className={timelineOpen && hasTimelineContent ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"}
                  name="chevronDown"
                  size={16}
                />
              }
              variant={timelineOpen && hasTimelineContent ? "secondary" : "ghost"}
            >
              时间线
              <span className="rounded-full bg-[#1f262f]/6 px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em]">
                {streamState.agentEvents.length}
              </span>
            </Button>
            {runStateLabel ? (
              <p className="text-sm leading-6 text-[#5d6973]">{runStateLabel}</p>
            ) : null}
          </div>

          <Panel
            padding="none"
            tone="soft"
            className="relative flex min-h-0 min-h-[18rem] flex-col overflow-hidden border-white/65 bg-[rgba(255,252,248,0.76)] md:min-h-0"
          >
            <div
              data-testid="message-list"
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-5 md:py-4"
              onScroll={handleScroll}
              ref={listRef}
            >
              {!session ? (
                <section className="rounded-[28px] border border-dashed border-[#1f262f]/10 bg-white/55 px-6 py-8 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b3211]">
                    准备开始
                  </p>
                  <h3 className="mt-3 font-display text-[2rem] tracking-[-0.04em] text-[#1f262f]">
                    先打开一个会话，再把任务交给 AI。
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#5d6973]">
                    左侧可以切换历史会话，右上角可打开当前会话的配置与实时日志。
                  </p>
                </section>
              ) : null}

              {session && isLoadingHistory && !hasMessages ? (
                <div className="grid gap-4">
                  <Skeleton className="h-28 max-w-[32rem]" />
                  <Skeleton className="h-36 max-w-[42rem]" />
                  <Skeleton className="h-28 max-w-[36rem]" />
                </div>
              ) : null}

              {session && historyErrorMessage ? (
                <Panel padding="md" tone="muted" className="border-[#9a2816]/12 bg-[#9a2816]/8 text-[#9a2816]">
                  <p className="text-sm leading-6">{historyErrorMessage}</p>
                </Panel>
              ) : null}

              {session && !isLoadingHistory && !historyErrorMessage && !hasMessages ? (
                <section className="rounded-[28px] border border-dashed border-[#1f262f]/10 bg-white/60 px-6 py-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b3211]">
                    当前会话为空
                  </p>
                  <h3 className="mt-3 font-display text-[2rem] tracking-[-0.04em] text-[#1f262f]">
                    从下方输入框发出第一条消息。
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6973]">
                    支持代码、列表和链接等 Markdown 输出，流式返回会自动跟随到底部。
                  </p>
                </section>
              ) : null}

              {messages.map((message) => (
                <article
                  data-testid={`message-card-${message.role}`}
                  key={message.id}
                  className={cn(
                    "max-w-[min(100%,48rem)] rounded-[28px] border px-4 py-4 shadow-[0_18px_38px_rgba(31,38,47,0.08)] md:px-5",
                    message.role === "assistant"
                      ? "border-[#1f262f]/8 bg-white/88 text-[#1f262f]"
                      : "ml-auto border-transparent bg-[#1f262f] text-[#fffaf4] shadow-[0_24px_54px_rgba(16,24,31,0.24)]"
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]",
                      message.role === "assistant" ? "text-[#5d6973]" : "text-[#f7f3ec]/56"
                    )}
                  >
                    <span>{roleLabel(message.role === "assistant" ? "assistant" : "user")}</span>
                    <span>{formatStreamStamp(message.createdAt)}</span>
                  </div>
                  {message.role === "assistant" ? (
                    <MarkdownRenderer content={message.text} />
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px] leading-7">{message.text}</p>
                  )}
                </article>
              ))}

              {streamState.streamingRuns.map((run) => (
                <article
                  data-testid="message-card-live"
                  key={run.runId}
                  className="max-w-[min(100%,48rem)] rounded-[28px] border border-[#13586d]/12 bg-[linear-gradient(180deg,rgba(19,88,109,0.08)_0%,rgba(255,255,255,0.9)_100%)] px-4 py-4 shadow-[0_20px_42px_rgba(19,88,109,0.12)] md:px-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#13586d]">
                    <span>AI 助手</span>
                    <span>生成中 {run.runId}</span>
                  </div>
                  {run.text ? (
                    <MarkdownRenderer content={run.text} showCursor />
                  ) : (
                    <div className="grid gap-3">
                      <Skeleton className="h-5 max-w-[18rem]" />
                      <Skeleton className="h-5 max-w-[26rem]" />
                    </div>
                  )}
                </article>
              ))}

              {hasPendingRunWithoutDelta ? (
                <article data-testid="message-card-pending" className="max-w-[min(100%,48rem)] rounded-[28px] border border-[#13586d]/10 bg-[#13586d]/6 px-4 py-4 shadow-[0_18px_36px_rgba(19,88,109,0.1)] md:px-5">
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#13586d]">
                    <span>AI 助手</span>
                    <span>{activeRunId}</span>
                  </div>
                  <div className="grid gap-3">
                    <Skeleton className="h-5 max-w-[18rem]" />
                    <Skeleton className="h-5 max-w-[26rem]" />
                  </div>
                </article>
              ) : null}

              {streamState.notices.map((notice) => (
                <article
                  data-testid="message-card-notice"
                  key={`${notice.type}-${notice.runId}-${notice.createdAt}`}
                  className="max-w-[min(100%,48rem)] rounded-[28px] border border-[#9a2816]/12 bg-[#9a2816]/8 px-4 py-4 text-[#7f2112] shadow-[0_16px_32px_rgba(154,40,22,0.08)] md:px-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a2816]">
                    <span>{notice.type === "error" ? "运行错误" : "运行已终止"}</span>
                    <span>{notice.runId}</span>
                  </div>
                  <p className="text-sm leading-7">{notice.message}</p>
                </article>
              ))}

              <ScrollAnchor>
                <div ref={anchorRef} />
              </ScrollAnchor>
            </div>

            {!isFollowing &&
            (hasMessages || isStreamingHistoryVisible(streamState, hasPendingRunWithoutDelta)) ? (
              <ScrollToBottomButton
                className="absolute right-5 bottom-5 shadow-[0_16px_32px_rgba(31,38,47,0.12)]"
                data-testid="scroll-to-bottom"
                onClick={() => scrollToBottom("smooth")}
              />
            ) : null}
          </Panel>
        </div>

        {timelineOpen && hasTimelineContent ? (
          <Panel
            padding="md"
            tone="elevated"
            className="flex max-h-[20rem] flex-col gap-4 border-white/70 bg-[rgba(255,252,248,0.9)] xl:max-h-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b3211]">
                  执行时间线
                </p>
                <h3 className="font-display text-[1.5rem] tracking-[-0.04em] text-[#1f262f]">
                  Agent 事件
                </h3>
              </div>
              <StatusPill tone="teal">{streamState.agentEvents.length} 条</StatusPill>
            </div>
            {runStateLabel ? <p className="text-sm leading-6 text-[#5d6973]">{runStateLabel}</p> : null}
            {streamState.agentEvents.length > 0 ? (
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
                {streamState.agentEvents.map((event) => (
                  <article
                    data-testid="timeline-event"
                    key={`${event.runId}-${event.createdAt}`}
                    className="space-y-2 rounded-[22px] border border-[#1f262f]/8 bg-[#1f262f]/3 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm text-[#1f262f]">{event.stage}</strong>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[#5d6973]">
                        {formatStreamStamp(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-[#4f5d68]">{event.message}</p>
                  </article>
                ))}
              </div>
            ) : (
              <Panel padding="md" tone="muted" className="border-[#1f262f]/6 bg-[#1f262f]/3">
                <p className="text-sm leading-6 text-[#5d6973]">本轮还没有 agent 事件。</p>
              </Panel>
            )}
          </Panel>
        ) : null}
      </section>

      <Panel
        padding="none"
        tone="dark"
        className={cn(
          "gap-2 bg-[linear-gradient(180deg,rgba(31,38,47,0.98)_0%,rgba(38,47,59,0.94)_70%,rgba(47,56,66,0.98)_100%)] px-5 py-3",
          composerFocused && "ring-1 ring-white/14"
        )}
      >
        <div className="flex flex-col gap-1 text-[13px] text-[#f7f3ec]/66 sm:flex-row sm:items-center sm:justify-between">
          <span>{session ? "描述任务、贴上代码，或直接给出修改目标。" : "选择会话后即可发送消息。"}</span>
          <span>Ctrl/Cmd + Enter 发送</span>
        </div>
        <Textarea
          data-testid="composer-input"
          tone="dark"
          className="min-h-[52px] max-h-40 resize-none border-white/10 bg-white/6 text-base leading-7 text-[#fffaf4]"
          ref={textareaRef}
          rows={1}
          placeholder={session ? "输入你的需求，例如：重构这个组件并补上测试。" : "请先选择一个会话。"}
          disabled={!session || Boolean(activeRunId)}
          value={composerValue}
          onBlur={() => setComposerFocused(false)}
          onChange={(event) => onComposerChange(event.target.value)}
          onFocus={() => setComposerFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSendMessage();
            }
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            data-testid="abort-run-button"
            onClick={onAbortRun}
            disabled={!activeRunId || isAbortingRun}
            size="sm"
            variant="contrast"
          >
            {isAbortingRun ? "正在停止..." : "停止生成"}
          </Button>
          <Button
            data-testid="send-message-button"
            onClick={onSendMessage}
            disabled={!session || isSendingMessage || Boolean(activeRunId) || !composerValue.trim()}
            size="sm"
          >
            {isSendingMessage ? "发送中..." : "发送"}
          </Button>
        </div>
      </Panel>
    </section>
  );
}

function isStreamingHistoryVisible(
  streamState: ChatStreamState,
  hasPendingRunWithoutDelta: boolean
): boolean {
  return (
    streamState.streamingRuns.length > 0 ||
    hasPendingRunWithoutDelta ||
    streamState.notices.length > 0
  );
}

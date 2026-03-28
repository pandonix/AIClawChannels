import { useDeferredValue, useMemo, useState } from "react";
import type { SessionSummary } from "@contracts";

import { Icon } from "./ui/icon";
import { Skeleton } from "./ui/skeleton";
import { Button, IconButton } from "./ui/button";
import { Drawer } from "./ui/drawer";
import { Input } from "./ui/input";
import { Panel } from "./ui/panel";
import { StatusPill } from "./ui/status-pill";

interface SessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
  errorMessage: string | null;
  newSessionName: string;
  onNewSessionNameChange: (value: string) => void;
  onCreateSession: () => void;
  isCreatingSession: boolean;
}

type SessionGroupKey = "today" | "yesterday" | "earlier";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function resolveSessionGroup(updatedAt: string): SessionGroupKey {
  const target = new Date(updatedAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / 86_400_000);

  if (diffDays <= 0) {
    return "today";
  }

  if (diffDays === 1) {
    return "yesterday";
  }

  return "earlier";
}

function groupLabel(group: SessionGroupKey): string {
  if (group === "today") {
    return "今天";
  }

  if (group === "yesterday") {
    return "昨天";
  }

  return "更早";
}

export function SessionPanel({
  isOpen,
  onClose,
  isLoading,
  sessions,
  selectedSessionId,
  onSelectSession,
  onRefresh,
  errorMessage,
  newSessionName,
  onNewSessionNameChange,
  onCreateSession,
  isCreatingSession
}: SessionPanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const visibleGroups = useMemo(() => {
    const keyword = deferredSearchValue.trim().toLowerCase();
    const matchedSessions = sessions.filter((session) => {
      if (!keyword) {
        return true;
      }

      const haystack = [
        session.title,
        session.agentId ?? "",
        session.lastMessagePreview ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });

    const groupOrder: SessionGroupKey[] = ["today", "yesterday", "earlier"];
    return groupOrder
      .map((group) => ({
        group,
        sessions: matchedSessions.filter((session) => resolveSessionGroup(session.updatedAt) === group)
      }))
      .filter((item) => item.sessions.length > 0);
  }, [deferredSearchValue, sessions]);

  return (
    <Drawer
      data-testid="session-panel"
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      className="border-white/12 bg-[linear-gradient(180deg,rgba(31,38,47,0.98)_0%,rgba(38,47,59,0.94)_100%)] text-[#fffaf4]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7b488]">
            AIClawChannels
          </p>
          <div className="space-y-1">
            <h2 className="font-display text-[2rem] leading-none tracking-[-0.05em]">
              会话历史
            </h2>
            <p className="max-w-sm text-sm text-[#f7f3ec]/68">
              切换上下文、搜索历史任务，或者从这里开始新的协作轮次。
            </p>
          </div>
        </div>
        <IconButton
          type="button"
          className="border-white/10 text-[#fffaf4] hover:border-white/20 hover:bg-white/10"
          onClick={onClose}
          variant="contrast"
          aria-label="关闭会话面板"
          title="关闭会话面板"
        >
          <Icon name="close" size={18} />
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-5">
        <Panel padding="md" tone="muted" className="space-y-4 border-white/10 bg-white/5 text-[#fffaf4]">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7b488]">
              新建会话
            </p>
            <p className="text-sm text-[#f7f3ec]/66">先命名，再进入主工作台开始对话。</p>
          </div>
          <Input
            data-testid="session-create-input"
            tone="dark"
            type="text"
            value={newSessionName}
            placeholder="输入会话标题"
            onChange={(event) => onNewSessionNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateSession();
              }
            }}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1"
              data-testid="session-create-button"
              onClick={onCreateSession}
              disabled={isCreatingSession || !newSessionName.trim()}
            >
              {isCreatingSession ? "创建中..." : "新建会话"}
            </Button>
            <Button className="sm:w-auto" data-testid="session-refresh-button" onClick={onRefresh} variant="contrast">
              刷新列表
            </Button>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7b488]">
                全部会话
              </p>
              <p className="text-sm text-[#f7f3ec]/66">按最近活跃时间分组，方便回到上一次上下文。</p>
            </div>
            <StatusPill className="border-white/10 bg-white/6 text-[#fffaf4]" tone="muted">
              {sessions.length} 个
            </StatusPill>
          </div>
          <Input
            data-testid="session-search-input"
            tone="dark"
            type="search"
            value={searchValue}
            placeholder="搜索标题、代理或最近消息"
            onChange={(event) => setSearchValue(event.target.value)}
          />
          {isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-28 rounded-[24px] bg-white/8" />
              <Skeleton className="h-28 rounded-[24px] bg-white/8" />
              <Skeleton className="h-28 rounded-[24px] bg-white/8" />
            </div>
          ) : null}
          {errorMessage ? (
            <Panel padding="sm" tone="muted" className="border-[#ffb6a3]/18 bg-[#9a2816]/12 text-[#ffcabd]">
              <p className="text-sm leading-6">{errorMessage}</p>
            </Panel>
          ) : null}
          {!isLoading && !errorMessage ? (
            visibleGroups.length > 0 ? (
              <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1" data-testid="session-list">
                {visibleGroups.map((group) => (
                  <section key={group.group} className="space-y-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7f3ec]/48">
                      <span>{groupLabel(group.group)}</span>
                      <span>{group.sessions.length}</span>
                    </div>
                    <ul className="grid gap-3">
                      {group.sessions.map((session) => {
                        const isActive = session.id === selectedSessionId;

                        return (
                          <li key={session.id}>
                            <button
                              data-testid={isActive ? "session-card-active" : "session-card"}
                              type="button"
                              className={`flex w-full flex-col gap-3 rounded-[24px] border px-4 py-4 text-left transition-[background-color,border-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7b488]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f262f] ${
                                isActive
                                  ? "border-[#f7b488]/20 bg-white/12 shadow-[0_22px_46px_rgba(16,24,31,0.24)]"
                                  : "border-white/6 bg-white/4 hover:border-white/12 hover:bg-white/7"
                              }`}
                              onClick={() => {
                                onSelectSession(session.id);
                                onClose();
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="line-clamp-2 text-sm font-semibold text-[#fffaf4]">
                                  {session.title}
                                </span>
                                {isActive ? (
                                  <StatusPill className="border-[#f7b488]/18 bg-[#f7b488]/12 text-[#fffaf4]">
                                    当前
                                  </StatusPill>
                                ) : null}
                              </div>
                              <span className="text-[11px] uppercase tracking-[0.2em] text-[#f7f3ec]/46">
                                {session.agentId ?? "默认代理"} · {formatTimestamp(session.updatedAt)}
                              </span>
                              <span className="line-clamp-3 text-sm leading-6 text-[#f7f3ec]/72">
                                {session.lastMessagePreview ?? "还没有消息，适合从一个明确任务开始。"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <Panel padding="md" tone="muted" className="border-white/8 bg-white/4 text-[#f7f3ec]/70">
                <p className="text-sm leading-6">没有匹配的会话结果。</p>
              </Panel>
            )
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}

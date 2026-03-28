import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { SessionSummary } from "@contracts";

import type { ChatStreamState } from "../hooks/use-chat-stream";
import { Button, IconButton } from "./ui/button";
import { Drawer } from "./ui/drawer";
import { Icon } from "./ui/icon";
import { Input } from "./ui/input";
import { Panel } from "./ui/panel";
import { StatusPill } from "./ui/status-pill";
import { Textarea } from "./ui/textarea";

interface WorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionSummary | null;
  titleDraft: string;
  onTitleDraftChange: (value: string) => void;
  onRenameSession: () => void;
  isRenamingSession: boolean;
  streamState: ChatStreamState;
}

interface ConfigSection {
  id: string;
  title: string;
  expanded: boolean;
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

function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

interface FieldProps {
  children: ReactNode;
  helper?: string;
  label: string;
}

function Field({ children, helper, label }: FieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f5d68]">
        {label}
      </label>
      {children}
      {helper ? <p className="text-sm leading-6 text-[#5d6973]">{helper}</p> : null}
    </div>
  );
}

interface PlannedSectionProps {
  children: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  title: string;
}

function PlannedSection({ children, expanded, onToggle, title }: PlannedSectionProps) {
  return (
    <Panel padding="md" tone="elevated" className="space-y-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[1.4rem] tracking-[-0.03em] text-[#1f262f]">
            {title}
          </h3>
          <StatusPill tone="muted">规划中</StatusPill>
        </div>
        <Icon
          className={expanded ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"}
          name="chevronDown"
          size={18}
        />
      </button>
      {expanded ? <div className="space-y-4">{children}</div> : null}
    </Panel>
  );
}

export function WorkspaceDrawer({
  isOpen,
  onClose,
  session,
  titleDraft,
  onTitleDraftChange,
  onRenameSession,
  isRenamingSession,
  streamState
}: WorkspaceDrawerProps) {
  const [sections, setSections] = useState<ConfigSection[]>([
    { id: "git", title: "Git 操作", expanded: false },
    { id: "context", title: "上下文约束", expanded: false },
    { id: "advanced", title: "高级调试", expanded: false }
  ]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unsupported">("idle");

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, expanded: !section.expanded } : section
      )
    );
  }

  useEffect(() => {
    if (streamState.agentEvents.length > 0) {
      setLogsExpanded(true);
    }
  }, [streamState.agentEvents.length]);

  async function handleCopySessionId(): Promise<void> {
    if (!session?.id || !navigator.clipboard) {
      setCopyState("unsupported");
      return;
    }

    try {
      await navigator.clipboard.writeText(session.id);
      setCopyState("copied");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 1_600);
    } catch {
      setCopyState("unsupported");
    }
  }

  const gitSection = sections.find((section) => section.id === "git");
  const contextSection = sections.find((section) => section.id === "context");
  const advancedSection = sections.find((section) => section.id === "advanced");
  const copyHelper =
    copyState === "copied"
      ? "会话 ID 已复制到剪贴板。"
      : copyState === "unsupported"
        ? "当前环境不支持复制到剪贴板。"
        : null;

  return (
    <Drawer
      data-testid="workspace-drawer"
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      className="border-white/45 bg-[linear-gradient(180deg,rgba(255,252,248,0.96)_0%,rgba(244,237,226,0.94)_100%)] text-[#1f262f]"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#1f262f]/8 px-5 py-5">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b3211]">
              会话配置
            </p>
            <h2 className="font-display text-[2rem] leading-none tracking-[-0.05em]">
              设置抽屉
            </h2>
          </div>
          <StatusPill tone={connectionTone(streamState.connectionState)}>
            {connectionLabel(streamState.connectionState)}
          </StatusPill>
        </div>
        <IconButton
          type="button"
          onClick={onClose}
          variant="secondary"
          aria-label="关闭设置抽屉"
          title="关闭设置抽屉"
        >
          <Icon name="close" size={18} />
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-5">
        <Panel padding="lg" tone="elevated" className="space-y-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b3211]">
              基础信息
            </p>
            <p className="text-sm leading-6 text-[#5d6973]">
              当前会话的核心元数据和命名入口都收在这里。
            </p>
          </div>
          <Field label="会话 ID" {...(copyHelper ? { helper: copyHelper } : {})}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                data-testid="session-id-input"
                className="bg-[#1f262f]/3"
                readOnly
                type="text"
                value={session?.id ?? "当前没有激活会话"}
              />
              <Button
                className="sm:w-auto"
                data-testid="copy-session-id-button"
                disabled={!session}
                onClick={() => {
                  void handleCopySessionId();
                }}
                leadingIcon={<Icon name="copy" size={15} />}
                variant="secondary"
              >
                复制
              </Button>
            </div>
          </Field>
          <Field label="会话标题">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                data-testid="session-title-input"
                type="text"
                value={titleDraft}
                placeholder="输入会话标题"
                disabled={!session}
                onChange={(event) => onTitleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onRenameSession();
                  }
                }}
              />
              <Button
                className="sm:w-auto"
                data-testid="rename-session-button"
                onClick={onRenameSession}
                disabled={!session || isRenamingSession || !titleDraft.trim()}
                variant="secondary"
              >
                {isRenamingSession ? "保存中..." : "保存标题"}
              </Button>
            </div>
          </Field>
          <Field label="代理 ID">
            <Input
              className="bg-[#1f262f]/3"
              readOnly
              type="text"
              value={session?.agentId ?? "默认代理"}
            />
          </Field>
        </Panel>

        <PlannedSection
          expanded={Boolean(gitSection?.expanded)}
          onToggle={() => toggleSection("git")}
          title={gitSection?.title ?? "Git 操作"}
        >
          <p className="text-sm leading-6 text-[#5d6973]">
            该区域将在后续阶段接入真实配置逻辑，本轮先保留信息结构。
          </p>
          <Field label="仓库">
            <Input disabled type="text" placeholder="例如：owner/repo" />
          </Field>
          <Field label="分支">
            <Input disabled type="text" placeholder="例如：main" />
          </Field>
          <Field label="标签模式">
            <Input disabled type="text" placeholder="例如：v*" />
          </Field>
        </PlannedSection>

        <PlannedSection
          expanded={Boolean(contextSection?.expanded)}
          onToggle={() => toggleSection("context")}
          title={contextSection?.title ?? "上下文约束"}
        >
          <p className="text-sm leading-6 text-[#5d6973]">
            上下文筛选尚未接入保存逻辑，暂时只展示未来配置形态。
          </p>
          <Field label="文件路径">
            <Input disabled type="text" placeholder="例如：src/**/*.ts" />
          </Field>
          <Field label="忽略模式">
            <Textarea disabled rows={3} placeholder="例如：node_modules, dist" />
          </Field>
        </PlannedSection>

        <PlannedSection
          expanded={Boolean(advancedSection?.expanded)}
          onToggle={() => toggleSection("advanced")}
          title={advancedSection?.title ?? "高级调试"}
        >
          <p className="text-sm leading-6 text-[#5d6973]">
            调试开关会在后续阶段与真实环境配置打通。
          </p>
          <Field label="WebSocket 网关">
            <Input disabled type="text" placeholder="ws://localhost:3001" />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#1f262f]/8 bg-[#1f262f]/3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#1f262f]">Mock 模式</p>
              <p className="text-sm text-[#5d6973]">功能规划中，当前不可编辑。</p>
            </div>
            <StatusPill tone="muted">关闭</StatusPill>
          </div>
        </PlannedSection>

        <Panel padding="md" tone="elevated" className="space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setLogsExpanded((current) => !current)}
          >
            <div className="flex items-center gap-3">
              <h3 className="font-display text-[1.4rem] tracking-[-0.03em] text-[#1f262f]">
                实时日志
              </h3>
              <StatusPill tone="teal">{streamState.agentEvents.length} 条</StatusPill>
            </div>
            <Icon
              className={logsExpanded ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"}
              name="chevronDown"
              size={18}
            />
          </button>
          {logsExpanded ? (
            streamState.agentEvents.length === 0 ? (
              <Panel padding="md" tone="muted" className="border-[#1f262f]/6 bg-[#1f262f]/3">
                <p className="text-sm leading-6 text-[#5d6973]">还没有 agent 事件。</p>
              </Panel>
            ) : (
              <ul className="grid gap-3">
                {streamState.agentEvents.map((event) => (
                  <li
                    key={`${event.runId}-${event.createdAt}`}
                    className="space-y-2 rounded-[22px] border border-[#1f262f]/8 bg-[#1f262f]/3 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-[#1f262f]">{event.stage}</span>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[#5d6973]">
                        {formatEventTime(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-[#4f5d68]">{event.message}</p>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </Panel>
      </div>
    </Drawer>
  );
}

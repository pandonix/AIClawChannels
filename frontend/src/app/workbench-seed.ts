import type {
  AgentEvent,
  ChatMessage,
  MessageDeltaEvent,
  SendChatRequest,
  SessionSummary,
} from "@contracts";

export const previewSessions: SessionSummary[] = [
  {
    id: "sess_20260329_design",
    title: "Rebuild Workspace",
    agentId: "agent.experimental.alpha",
    createdAt: "2026-03-29T08:00:00.000Z",
    updatedAt: "2026-03-29T08:16:00.000Z",
    lastMessagePreview: "先把前端工作区、类型和视觉 token 基线建起来。",
  },
  {
    id: "sess_20260328_runtime",
    title: "Runtime Alignment",
    agentId: null,
    createdAt: "2026-03-28T15:20:00.000Z",
    updatedAt: "2026-03-28T18:04:00.000Z",
    lastMessagePreview: "确认 stream、abort 与 history 的最终 contract。",
  },
];

const activeSession = previewSessions[0]!;

export const previewHistory: ChatMessage[] = [
  {
    id: "msg_seed_001",
    role: "user",
    text: "基于 docs 中前端的设计以及 TODO，启动开发任务。",
    createdAt: "2026-03-29T08:10:00.000Z",
  },
  {
    id: "msg_seed_002",
    role: "assistant",
    text:
      "先完成前端工作区、Tailwind token、共享类型与运行环境配置，再进入会话与聊天主链路实现。",
    createdAt: "2026-03-29T08:10:07.000Z",
  },
  {
    id: "msg_seed_003",
    role: "user",
    text: "每一个里程碑完成之后，都需要提交 git commit。",
    createdAt: "2026-03-29T08:10:35.000Z",
  },
];

export const previewSendRequest: SendChatRequest = {
  sessionId: activeSession.id,
  message: "把 M1 做成可运行、可构建、可类型检查的前端基线。",
  clientRequestId: "req_preview_m1",
};

export const previewAgentTimeline: AgentEvent[] = [
  {
    sessionId: activeSession.id,
    runId: "run_preview_m1",
    stage: "thinking",
    message: "校对 workspace、TypeScript paths 和 Vite alias。",
    createdAt: "2026-03-29T08:11:01.000Z",
  },
  {
    sessionId: activeSession.id,
    runId: "run_preview_m1",
    stage: "tool",
    message: "接入 Tailwind CSS 与桌面工作台视觉 token。",
    createdAt: "2026-03-29T08:11:19.000Z",
  },
  {
    sessionId: activeSession.id,
    runId: "run_preview_m1",
    stage: "status",
    message: "build / typecheck 准备完成。",
    createdAt: "2026-03-29T08:11:46.000Z",
  },
];

export const previewDelta: MessageDeltaEvent = {
  sessionId: activeSession.id,
  runId: "run_preview_m1",
  delta: "当前界面还没有接入真实请求，但 contract、env 和设计基线已经就位。",
  createdAt: "2026-03-29T08:12:03.000Z",
};

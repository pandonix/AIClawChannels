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

export const defaultSessionId = previewSessions[0]!.id;

const previewHistoryBySession: Record<string, ChatMessage[]> = {
  [previewSessions[0]!.id]: [
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
  ],
  [previewSessions[1]!.id]: [
    {
      id: "msg_seed_101",
      role: "user",
      text: "当前 stream API 只按 sessionId 建单连接，没有事件重放。",
      createdAt: "2026-03-28T17:42:00.000Z",
    },
    {
      id: "msg_seed_102",
      role: "assistant",
      text: "前端需要自己管理 reconnecting、closed、error，以及 final 丢失时的 history 补拉兜底。",
      createdAt: "2026-03-28T17:42:11.000Z",
    },
  ],
};

const previewAgentTimelineBySession: Record<string, AgentEvent[]> = {
  [previewSessions[0]!.id]: [
    {
      sessionId: previewSessions[0]!.id,
      runId: "run_preview_m2",
      stage: "thinking",
      message: "校对 workspace、TypeScript paths 和 Vite alias。",
      createdAt: "2026-03-29T08:11:01.000Z",
    },
    {
      sessionId: previewSessions[0]!.id,
      runId: "run_preview_m2",
      stage: "tool",
      message: "拆分 Drawer / Dialog / Popover 原语与 workbench state。",
      createdAt: "2026-03-29T08:11:19.000Z",
    },
    {
      sessionId: previewSessions[0]!.id,
      runId: "run_preview_m2",
      stage: "status",
      message: "路由、请求层与 SSE 客户端准备完成。",
      createdAt: "2026-03-29T08:11:46.000Z",
    },
  ],
  [previewSessions[1]!.id]: [
    {
      sessionId: previewSessions[1]!.id,
      runId: "run_preview_contract",
      stage: "thinking",
      message: "对齐 reconnect 与 final 丢失场景的前端状态收敛。",
      createdAt: "2026-03-28T17:43:01.000Z",
    },
    {
      sessionId: previewSessions[1]!.id,
      runId: "run_preview_contract",
      stage: "status",
      message: "当前阶段先沉淀基础设施，不提前开放未连通的业务按钮。",
      createdAt: "2026-03-28T17:43:16.000Z",
    },
  ],
};

const previewDeltaBySession: Record<string, MessageDeltaEvent | null> = {
  [previewSessions[0]!.id]: {
    sessionId: previewSessions[0]!.id,
    runId: "run_preview_m2",
    delta:
      "当前界面还没有接入真实请求，但路由、状态、抽屉与请求封装已经可以承接后续业务接线。",
    createdAt: "2026-03-29T08:12:03.000Z",
  },
  [previewSessions[1]!.id]: null,
};

const previewDraftBySession: Record<string, SendChatRequest> = {
  [previewSessions[0]!.id]: {
    sessionId: previewSessions[0]!.id,
    message: "把 M2 的基础设施沉淀成后续会话与聊天能力可复用的骨架。",
    clientRequestId: "req_preview_m2",
  },
  [previewSessions[1]!.id]: {
    sessionId: previewSessions[1]!.id,
    message: "把 stream 连接状态、history 补拉与 abort 生命周期统一进一个状态模型。",
    clientRequestId: "req_preview_contract",
  },
};

export function getPreviewSessionData(sessionId: string) {
  return {
    history:
      previewHistoryBySession[sessionId] ??
      previewHistoryBySession[defaultSessionId]!,
    agentEvents:
      previewAgentTimelineBySession[sessionId] ??
      previewAgentTimelineBySession[defaultSessionId]!,
    liveMessage:
      previewDeltaBySession[sessionId] ??
      previewDeltaBySession[defaultSessionId] ??
      null,
    sendRequest:
      previewDraftBySession[sessionId] ?? previewDraftBySession[defaultSessionId]!,
  };
}

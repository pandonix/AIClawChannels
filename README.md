# AIClawChannels

基于 OpenClaw Gateway 构建的自定义 Web Channels 项目。

当前仓库已经进入 `feat/bootstrap-contract` 前置开发阶段，目标是先冻结工程骨架、API/SSE 契约和 mock 策略，再让不同 worktree 并行推进。

## 架构概览

```text
Frontend Web UI <-> Custom Backend (HTTP/SSE) <-> OpenClaw Gateway (WS)
```

约束：

- 前端不直接访问 Gateway
- 后端统一处理 Gateway 握手、认证、重连和事件分发
- 前端只消费自定义业务 API

## 当前阶段产物

已落地：

- `frontend/` Vite + React + TypeScript 工程骨架
- `backend/` Fastify + TypeScript 工程骨架
- `packages/contracts/` 共享 DTO 与 SSE 事件类型
- `docs/api-contract.md` 契约冻结文档
- mock backend provider，用于前端独立开发
- `backend/src/gateway/` 的 Gateway client 基础骨架与 probe 入口
- `todo.md` 中的 worktree 分工与协作规则

后续 worktree 继续负责：

- `feat/backend-gateway-core`：真实 Gateway WS 客户端
- `feat/backend-api-session`：会话和聊天服务层
- `feat/backend-sse-events`：事件总线和 SSE
- `feat/frontend-chat-shell`：聊天 UI 壳和会话管理
- `feat/frontend-streaming`：流式交互和 agent 事件
- `feat/persistence-auth`：SQLite、认证和用户隔离

## 目录结构

```text
.
├── backend/
├── docs/
├── frontend/
├── packages/
│   └── contracts/
├── todo.md
└── README.md
```

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 启动 backend

```bash
npm run dev:backend
```

3. 启动 frontend

```bash
npm run dev:frontend
```

默认配置下：

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- backend 以 `MOCK_GATEWAY=true` 运行

如果要验证真实 Gateway 握手：

```bash
MOCK_GATEWAY=false npm run gateway:probe --workspace backend
```

## 契约与文档

- 设计方案：[docs/openclaw-web-channel-design.md](/Users/sunnyin/Documents/workspace/AIClawChannels-bootstrap/docs/openclaw-web-channel-design.md)
- API 契约：[docs/api-contract.md](/Users/sunnyin/Documents/workspace/AIClawChannels-bootstrap/docs/api-contract.md)
- 任务拆解与 worktree 指引：[todo.md](/Users/sunnyin/Documents/workspace/AIClawChannels-bootstrap/todo.md)

# AIClawChannels

基于 OpenClaw Gateway 构建的自定义 Web Channels 项目。

## 架构概览

```text
Frontend Web UI <-> Custom Backend (HTTP/SSE) <-> OpenClaw Gateway (WS)
```

约束：

- 前端不直接访问 Gateway
- 后端统一处理 Gateway 握手、认证、重连和事件分发
- 前端只消费自定义业务 API

## 目录结构

```text
.
├── backend/
│   └── src/
│       ├── app.ts                  # 应用入口，runtime 装配
│       ├── chat/                   # 聊天服务层
│       ├── config/                 # 环境变量加载
│       ├── event-bus/              # SSE 事件总线
│       ├── gateway/                # Gateway WS 客户端与重连管理
│       ├── mock/                   # Mock Gateway（本地开发用）
│       ├── routes/                 # HTTP/SSE 路由
│       ├── runtime/                # BackendRuntime 接口定义
│       └── sessions/               # 会话服务层
├── docs/
│   ├── api-contract.md             # API/SSE 契约
│   └── openclaw-web-channel-design.md
├── frontend/
│   └── src/
│       ├── api/                    # HTTP API 客户端
│       ├── components/             # 聊天 UI 组件
│       ├── hooks/                  # SSE 状态管理
│       ├── lib/sse/                # EventSource 封装
│       └── pages/                  # 页面
├── packages/
│   └── contracts/                  # 共享 DTO 与 SSE 事件类型
└── todo.md
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
- backend 以 `MOCK_GATEWAY=true` 运行，使用内置 mock runtime

如需连接真实 Gateway：

```bash
MOCK_GATEWAY=false \
GATEWAY_OPERATOR_TOKEN=your_gateway_token \
npm run dev:backend
```

如果本地 Gateway 开启了 token 鉴权，`GATEWAY_OPERATOR_TOKEN` 必填。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MOCK_GATEWAY` | `true` | `false` 时切换到真实 Gateway runtime |
| `GATEWAY_WS_URL` | `ws://127.0.0.1:18789` | OpenClaw Gateway WebSocket 地址 |
| `GATEWAY_OPERATOR_TOKEN` | — | operator token 鉴权 |
| `GATEWAY_OPERATOR_PASSWORD` | — | operator password 鉴权 |
| `GATEWAY_DEVICE_TOKEN` | — | device token（可由 Gateway 下发后自动缓存） |
| `GATEWAY_SCOPES` | `operator.read,operator.write` | 请求的权限范围 |
| `GATEWAY_TLS_FINGERPRINT` | — | wss:// 时的 TLS 证书指纹校验 |
| `GATEWAY_DEVICE_IDENTITY_PATH` | — | device 密钥对持久化路径 |
| `PORT` | `3001` | backend 监听端口 |

## 当前状态

MVP 核心链路已完成联调：

- mock runtime：
- 会话列表加载、创建、重命名
- 聊天历史加载、发送消息
- SSE 流式事件：`agent.event`、`message.delta`、`message.final`
- SSE 断线重连，重连后继续接收后续事件
- 前端在重连恢复后补拉 history，兜底 `message.final` 丢失场景
- 停止操作触发 `run.aborted`

- 真实 Gateway（2026-03-11，本地 OpenClaw Gateway）：
- `MOCK_GATEWAY=false` 时可完成真实握手、鉴权与会话水合
- `GET /api/sessions`、`GET /api/chat/history`、`POST /api/chat/send`、`POST /api/chat/abort` 已打通
- SSE 已确认收到 `agent.event`、`message.final`、`run.aborted`
- 针对 Gateway `chat state=final` 不携带正文的情况，后端已在 final 到达时回补 `chat.history` 获取最终消息文本

当前剩余方向主要是持久化、认证和部署样板，不再是 Gateway runtime 接线。

## 契约与文档

- 设计方案：[docs/openclaw-web-channel-design.md](docs/openclaw-web-channel-design.md)
- API 契约：[docs/api-contract.md](docs/api-contract.md)
- 任务拆解：[todo.md](todo.md)

# AIClawChannels

基于 OpenClaw Gateway 的自定义 Web Channel workspace。

当前仓库已经完成 desktop Web 前端重建 MVP。前端只对接 backend 暴露的 HTTP / SSE contract，不直接访问 Gateway。

## 当前范围

- `frontend/`: React + TypeScript + Vite + Tailwind 的桌面端聊天工作台
- `backend/`: Fastify 服务，负责会话 API、聊天 API、SSE、Gateway 接线和 mock runtime
- `packages/contracts/`: 前后端共享 DTO 与 SSE 事件类型
- `docs/api-contract.md`: 当前 HTTP / SSE 契约
- `e2e/`: 基于 Playwright 的前端主链路验证

## 架构边界

```text
Frontend Web UI <-> Custom Backend (HTTP/SSE) <-> OpenClaw Gateway (WS)
```

约束保持不变：

- 前端不直接访问 Gateway
- backend 统一处理 Gateway 握手、鉴权、重连、事件映射和 sessionKey 管理
- 前端只面向 backend 的业务 API 和 SSE contract 开发

## 目录结构

```text
.
├── frontend/
│   └── src/
│       ├── components/            # 布局与 UI 原语
│       ├── config/                # 运行环境配置
│       ├── features/workbench/    # 会话、聊天、SSE 工作台
│       └── lib/                   # HTTP / SSE / utils
├── backend/
│   └── src/
│       ├── app.ts
│       ├── chat/
│       ├── config/
│       ├── event-bus/
│       ├── gateway/
│       ├── mock/
│       ├── routes/
│       ├── runtime/
│       └── sessions/
├── docs/
│   ├── api-contract.md
│   └── frontend-design-plan.md
├── e2e/
│   └── tests/
├── packages/
│   └── contracts/
└── package.json
```

## 当前 backend 能力

HTTP:

- `GET /api/sessions`
- `POST /api/sessions`
- `PATCH /api/sessions/:id`
- `GET /api/chat/history`
- `POST /api/chat/send`
- `POST /api/chat/abort`
- `GET /api/chat/stream`
- `GET /health`

SSE 事件：

- `agent.event`
- `message.delta`
- `message.final`
- `run.aborted`
- `run.error`

开发态辅助接口：

- `POST /dev/sse-disconnect`

具体字段和行为见 [docs/api-contract.md](docs/api-contract.md)。

## 本地运行

先安装依赖：

```bash
npm install
```

启动 backend：

```bash
npm run dev:backend
```

启动 frontend：

```bash
npm run dev:frontend
```

默认地址：

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

健康检查：

```bash
curl http://localhost:3001/health
```

前端环境变量示例见 [frontend/.env.example](frontend/.env.example)。

## 根工作区脚本

```bash
npm run build
npm run typecheck
npm run dev:backend
npm run dev:frontend
npm run test:e2e
npm run test:e2e:ui
```

## 连接模式

### Mock mode

默认开发配置：

```bash
MOCK_GATEWAY=true npm run dev:backend
```

特点：

- 不连接真实 Gateway
- 启动后可直接使用会话、聊天和 SSE
- 默认带一个种子会话，便于前端联调

### Gateway mode

```bash
MOCK_GATEWAY=false \
GATEWAY_OPERATOR_TOKEN=your_gateway_token \
npm run dev:backend
```

如果 Gateway 使用 password 或 device token，也可以补充对应环境变量。frontend 仍然只连 backend。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `development` | 非 production 时会注册开发态接口 |
| `PORT` | `3001` | backend 监听端口 |
| `MOCK_GATEWAY` | `true` | 是否启用 mock runtime |
| `GATEWAY_WS_URL` | `ws://127.0.0.1:18789` | Gateway WebSocket 地址 |
| `GATEWAY_OPERATOR_TOKEN` | - | Gateway operator token |
| `GATEWAY_OPERATOR_PASSWORD` | - | Gateway operator password |
| `GATEWAY_DEVICE_TOKEN` | - | Gateway device token |
| `GATEWAY_SCOPES` | `operator.read,operator.write` | Gateway scopes，逗号分隔 |
| `GATEWAY_TLS_FINGERPRINT` | - | `wss://` 证书指纹校验 |
| `GATEWAY_DEVICE_IDENTITY_PATH` | - | device 身份文件持久化路径 |
| `VITE_API_BASE_URL` | `http://localhost:3001` | frontend API base URL |

## E2E 验证

运行 Playwright：

```bash
npm run test:e2e
```

当前 e2e 覆盖：

- 会话创建、重命名与自动选中
- Drawer / Dialog / Settings 的键盘交互
- Composer 发送与 Stop 中止
- SSE 断线重连
- `message.final` 丢失窗口下的 history backfill
- 连接诊断浮层展示

## 当前约束

- `packages/contracts` 目前只是源码目录，不是独立发布包
- session 列表、会话 patch、run 幂等记录等仍以进程内内存状态为主
- `gateway` 模式下的 `POST /api/sessions` 目前是 backend 本地创建会话元数据，不等同于持久化创建远端会话
- `agentId` 已进合同，但暂未形成完整业务语义
- 当前前端只按 desktop Web 设计，不做移动端适配

## 继续迭代时的对齐输入

1. 以 [docs/api-contract.md](docs/api-contract.md) 为接口合同。
2. 以 [packages/contracts/src/index.ts](packages/contracts/src/index.ts) 为类型来源。
3. 以 [backend/src/routes/chat.ts](backend/src/routes/chat.ts)、[backend/src/routes/sessions.ts](backend/src/routes/sessions.ts)、[backend/src/routes/stream.ts](backend/src/routes/stream.ts) 为实际行为基准。
4. 以 `e2e/` 里的 Playwright 场景作为当前 MVP 验证基线。

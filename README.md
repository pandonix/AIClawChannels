# AIClawChannels

基于 OpenClaw Gateway 的自定义 Web Channel backend。

当前仓库已经删除旧前端实现，现阶段应把 backend、共享 contract 和本文档视为项目基线；后续新前端需要围绕它们重新搭建。

## 当前项目范围

当前保留并可作为事实来源的部分只有：

- `backend/`: Fastify 服务，负责会话 API、聊天 API、SSE、Gateway 接线和 mock runtime
- `packages/contracts/`: 前后端共享 DTO 与 SSE 事件类型
- `docs/api-contract.md`: 现行 HTTP/SSE 契约
- `e2e/`: 旧 MVP 的交互目标记录；因为前端已移除，当前不能直接作为可运行验证

已经不应再作为当前项目依据的内容：

- 旧前端页面结构与交互实现
- 已删除的设计/重构文档

## 架构边界

```text
Future Frontend Web UI <-> Custom Backend (HTTP/SSE) <-> OpenClaw Gateway (WS)
```

约束保持不变：

- 前端不直接访问 Gateway
- backend 统一处理 Gateway 握手、鉴权、重连、事件映射和 sessionKey 管理
- 新前端只面向 backend 的业务 API 和 SSE contract 开发

## 当前目录结构

```text
.
├── backend/
│   └── src/
│       ├── app.ts                  # Fastify 入口与 runtime 装配
│       ├── chat/                   # 聊天服务
│       ├── config/                 # 环境变量加载
│       ├── event-bus/              # SSE 事件订阅与 Gateway 事件映射
│       ├── gateway/                # Gateway WS 客户端、鉴权、重连
│       ├── mock/                   # 本地 mock gateway
│       ├── routes/                 # HTTP/SSE 路由
│       ├── runtime/                # mock / gateway runtime 适配层
│       └── sessions/               # 会话服务
├── docs/
│   └── api-contract.md             # 当前 API / SSE 契约
├── e2e/                            # 旧前端 MVP 目标用例，当前缺少运行前提
├── packages/
│   └── contracts/
│       └── src/index.ts            # DTO 与 SSE 类型
├── package.json                    # 根工作区配置，仍残留 frontend 相关项
└── tsconfig.base.json              # @contracts 路径映射
```

## 当前后端能力

已实现并可供新前端直接对接的能力：

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

具体字段、错误响应和运行语义见 [docs/api-contract.md](docs/api-contract.md)。

## 本地运行 backend

由于当前仓库已经删除 `frontend/`，根目录工作区脚本和 `package.json` 里仍有部分 frontend 残留配置，不应再把根目录脚本当作当前可靠入口。

推荐直接在 `backend/` 目录运行：

```bash
cd backend
npm install
npm run dev
```

默认监听：

- backend: `http://localhost:3001`

健康检查：

```bash
curl http://localhost:3001/health
```

## 连接模式

### Mock mode

默认配置：

```bash
cd backend
MOCK_GATEWAY=true npm run dev
```

特点：

- 不连接真实 Gateway
- 启动后可直接使用会话、聊天和 SSE
- 默认包含一个种子会话，便于新前端先做联调

### Gateway mode

连接真实 Gateway：

```bash
cd backend
MOCK_GATEWAY=false \
GATEWAY_OPERATOR_TOKEN=your_gateway_token \
npm run dev
```

如果你的 Gateway 使用 password 或 device token，也可以补充对应环境变量。

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

## 现阶段约束

- 当前没有可运行的前端实现；新前端需要从零开始重建
- `packages/contracts` 目前只是源码目录，不是独立发布包
- session 列表、会话 patch、run 幂等记录等都仍以进程内内存状态为主
- `gateway` 模式下的 `POST /api/sessions` 目前是 backend 本地创建会话元数据，不等同于持久化创建远端会话
- `agentId` 已进合同，但暂未形成完整业务语义
- `e2e/` 用例保留的是最早 MVP 交互目标，不代表当前仓库已经具备可执行的前端

## 下一步前端重建建议

如果接下来要重建前端，当前最稳的输入顺序是：

1. 以 [docs/api-contract.md](docs/api-contract.md) 为接口合同。
2. 以 [packages/contracts/src/index.ts](packages/contracts/src/index.ts) 为类型来源。
3. 以 [backend/src/routes/chat.ts](backend/src/routes/chat.ts)、[backend/src/routes/sessions.ts](backend/src/routes/sessions.ts)、[backend/src/routes/stream.ts](backend/src/routes/stream.ts) 为实际行为基准。
4. 以 `e2e/` 中的旧场景作为交互目标参考，而不是当前实现现状。

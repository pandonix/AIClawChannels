# OpenClaw Web Channels 设计方案

## 目标

基于 OpenClaw Gateway 已有协议，开发一个自有 Web 页面，作为自己的 channels 入口与 OpenClaw 交互。

本方案采用前后端分离架构：

- 前端页面只和自有后端通过 HTTP/SSE 通讯
- 自有后端作为代理层，通过 WebSocket 协议与 OpenClaw Gateway 通讯
- OpenClaw Gateway 保持现有能力和协议不变

## 设计结论

不建议让浏览器直接连接 Gateway。

更合适的方式是：

1. 前端负责展示和交互
2. 自有后端负责认证、会话管理、事件分发和协议适配
3. 后端内部作为一个 `operator/ui` 类型的 Gateway 客户端

这样可以避免在浏览器暴露 Gateway 高权限凭证，也更容易扩展登录、权限、审计和公网部署。

## 总体架构

```text
+-------------------+        HTTP / SSE         +------------------------+        WebSocket JSON RPC        +------------------+
| Frontend Web UI   | <-----------------------> | Custom Backend Proxy   | <-----------------------------> | OpenClaw Gateway |
| React/Vite        |                           | Node.js/Fastify        |                                 | WS + Agent Core  |
+-------------------+                           +------------------------+                                 +------------------+
```

## 分层职责

### 1. 前端 Web UI

职责：

- 登录后展示会话列表
- 展示聊天历史
- 发送消息
- 通过 SSE 接收流式回复
- 展示工具调用和运行事件
- 停止当前生成

约束：

- 不直接连接 Gateway
- 不持有 Gateway token、password、device token
- 不感知 Gateway 原生 WS 协议细节

### 2. 自有后端 Proxy / BFF

职责：

- 对前端暴露 HTTP API 和 SSE 流
- 建立并维护与 Gateway 的 WS 长连接
- 完成 `connect.challenge -> connect -> hello-ok` 握手
- 管理 Gateway 凭证和 device token
- 将前端业务请求转换为 Gateway RPC 请求
- 将 Gateway `chat` / `agent` 等事件转换为前端 SSE 事件
- 管理用户与会话的映射关系

### 3. OpenClaw Gateway

职责：

- 作为唯一的 AI 控制平面
- 维护 session、agent、tool、channel 等运行状态
- 提供 `chat.history`、`chat.send`、`chat.abort`、`sessions.list` 等 RPC 能力

## 为什么使用“HTTP 前端 + WS 后端代理”

### 优点

- 浏览器无需实现 Gateway 握手、设备配对、重连和协议兼容
- Gateway 凭证仅保存在后端
- 后端可以自行定义用户、组织、权限和审计规则
- 前端协议可以更稳定，不受 Gateway 内部协议小变化直接影响
- 更适合之后接入公网、HTTPS、SSO 或反向代理

### 与浏览器直连 Gateway 的区别

- 浏览器直连更快起步，但安全边界差
- 后端代理模式更适合长期维护和产品化

## Gateway 对接方式

后端内部作为一个长期存活的 Gateway WS 客户端，使用 `operator` 角色连接。

建议 scope：

- `operator.read`
- `operator.write`

后续如果要做更高级能力，再按需增加：

- `operator.admin`
- `operator.approvals`
- `operator.pairing`

## 核心 Gateway 方法映射

后端优先对接以下方法：

- `chat.history`
- `chat.send`
- `chat.abort`
- `chat.inject`
- `sessions.list`
- `sessions.patch`
- `system-presence`

建议 MVP 阶段固定：

- `chat.send.deliver = false`

这样网页消息不会再回投到 Telegram、WhatsApp、Slack 等外部渠道。

## 前端 API 设计

前端不直接学习 Gateway 协议，统一走自定义业务 API。

### 会话接口

`GET /api/sessions`

返回当前用户可见的会话列表。

`POST /api/sessions`

创建新会话。

请求示例：

```json
{
  "name": "默认会话"
}
```

返回示例：

```json
{
  "id": "sess_001",
  "title": "默认会话",
  "createdAt": "2026-03-11T12:00:00Z"
}
```

`PATCH /api/sessions/:id`

修改标题、绑定 agent、更新会话偏好等。

### 聊天接口

`GET /api/chat/history?sessionId=sess_001`

返回示例：

```json
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "text": "你好",
      "createdAt": "2026-03-11T12:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "text": "你好，有什么需要处理？",
      "createdAt": "2026-03-11T12:00:02Z"
    }
  ]
}
```

`POST /api/chat/send`

请求示例：

```json
{
  "sessionId": "sess_001",
  "message": "帮我总结一下当前项目",
  "clientRequestId": "req_001"
}
```

返回示例：

```json
{
  "accepted": true,
  "runId": "run_001"
}
```

`POST /api/chat/abort`

请求示例：

```json
{
  "sessionId": "sess_001",
  "runId": "run_001"
}
```

### 流式接口

`GET /api/chat/stream?sessionId=sess_001`

使用 `text/event-stream`，由后端将 Gateway WS 事件转换为 SSE。

建议事件类型：

- `message.delta`
- `message.final`
- `agent.event`
- `run.aborted`
- `run.error`

## 后端到 Gateway 的协议映射

### 请求映射

前端 `POST /api/chat/send`

映射为：

```json
{
  "type": "req",
  "method": "chat.send",
  "params": {
    "sessionKey": "web:user_001:default",
    "message": "帮我总结一下当前项目",
    "deliver": false,
    "idempotencyKey": "req_001"
  }
}
```

前端 `GET /api/chat/history`

映射为：

```json
{
  "type": "req",
  "method": "chat.history",
  "params": {
    "sessionKey": "web:user_001:default",
    "limit": 200
  }
}
```

前端 `POST /api/chat/abort`

映射为：

```json
{
  "type": "req",
  "method": "chat.abort",
  "params": {
    "sessionKey": "web:user_001:default",
    "runId": "run_001"
  }
}
```

### 事件映射

Gateway 事件：

- `chat` + `state=delta` -> SSE `message.delta`
- `chat` + `state=final` -> SSE `message.final`
- `chat` + `state=aborted` -> SSE `run.aborted`
- `chat` + `state=error` -> SSE `run.error`
- `agent` -> SSE `agent.event`

## 会话模型设计

建议维护两层会话标识：

- 前端业务会话 ID：`sessionId`
- Gateway 会话键：`sessionKey`

映射关系示例：

```text
sessionId:  sess_001
sessionKey: web:user_001:default
```

这样做的好处：

- 前端可以使用更短、更稳定的业务 ID
- 后端可以自由调整 Gateway `sessionKey` 规则
- 可以在不影响前端的情况下支持多用户、多 agent、多租户

## 后端模块设计

建议拆分如下模块：

### `gateway-client`

职责：

- 建立 WS 连接
- 接收 `connect.challenge`
- 发送 `connect`
- 管理 request/response 的 `id` 映射
- 维护重连逻辑
- 缓存和刷新 device token

### `chat-service`

职责：

- 调用 `chat.history`
- 调用 `chat.send`
- 调用 `chat.abort`
- 维护 `runId`、`sessionKey`、`clientRequestId` 的关系

### `event-bus`

职责：

- 订阅 Gateway 事件
- 按 `sessionKey` 分发给前端 SSE
- 处理断线重连后的订阅恢复

### `session-service`

职责：

- 前端 `sessionId` 与 Gateway `sessionKey` 映射
- 保存会话标题、标签、最近更新时间
- 可选支持 agent 绑定

### `auth-service`

职责：

- 管理自有系统用户登录态
- 控制用户能访问哪些 `sessionId`

## 长连接策略

不建议“每个前端用户对应一条 Gateway WS”。

建议先采用：

- 单个后端实例维护 1 条 Gateway WS 长连接
- 所有前端请求复用该连接
- 通过 `sessionKey` 做事件分发

后续如果并发上来，再扩展为连接池：

- 连接池大小按实例并发量配置
- 同一 `sessionKey` 固定路由到同一连接，减少状态混乱

## SSE 设计建议

前端实时流建议采用 SSE，而不是前后端再套一层 WS。

原因：

- 对聊天场景足够
- 前端实现简单
- 服务端只需要单向推送
- 更符合“后端代理 Gateway”的职责边界

SSE 事件格式示例：

```text
event: message.delta
data: {"sessionId":"sess_001","runId":"run_001","delta":"正在分析..."}
```

```text
event: message.final
data: {"sessionId":"sess_001","runId":"run_001","message":"这是最终结果"}
```

## 数据存储建议

MVP 阶段可使用 SQLite。

建议表：

### `users`

- `id`
- `username`
- `password_hash` 或外部认证标识
- `created_at`

### `sessions`

- `id`
- `user_id`
- `gateway_session_key`
- `title`
- `agent_id`
- `created_at`
- `updated_at`

### `chat_runs`

- `id`
- `session_id`
- `gateway_run_id`
- `client_request_id`
- `status`
- `created_at`
- `finished_at`

### `gateway_state`

- `id`
- `device_token`
- `last_connected_at`
- `meta_json`

## 安全设计

### 基本原则

- 前端永远不持有 Gateway token
- Gateway 尽量保持 `loopback` 监听
- 自有后端与 Gateway 走本机、内网、SSH tunnel 或 Tailscale
- 公网入口只暴露自有后端

### 推荐部署

#### 本机开发

- Frontend dev server
- Backend 本机启动
- Backend 连接 `ws://127.0.0.1:18789`

#### 远程私有部署

- Gateway 保持 loopback
- 通过 SSH tunnel 或 Tailscale 让 Backend 访问 Gateway
- 前端访问公开 HTTPS 域名

#### 公网生产

- 前端静态资源挂在 CDN 或 Nginx
- Backend 走 HTTPS
- Backend 到 Gateway 走内网或同机 loopback
- 后端统一做登录、鉴权和审计

## 技术栈建议

### 前端

- React
- Vite
- TypeScript
- TanStack Query
- EventSource 或封装的 SSE 客户端

### 后端

- Node.js
- Fastify
- TypeScript
- `ws` 作为 Gateway 客户端
- SQLite + Prisma 或 Drizzle

## 项目目录建议

```text
.
├── docs/
│   └── openclaw-web-channel-design.md
├── frontend/
│   ├── src/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── gateway/
│   │   ├── chat/
│   │   ├── sessions/
│   │   ├── auth/
│   │   └── app.ts
│   └── package.json
└── README.md
```

## MVP 范围

第一阶段建议只做：

- 用户登录
- 会话列表
- 新建会话
- 聊天历史
- 发送消息
- SSE 流式回复
- 停止回复
- 自动重连和错误提示

暂不做：

- Gateway 配置编辑
- channel 管理
- tools 审批
- 多 agent 复杂策略
- 多租户细粒度权限

## 分阶段实施建议

### 第一阶段

- 搭建前后端骨架
- 后端跑通 Gateway WS 握手
- 完成 `chat.history` / `chat.send` / `chat.abort`
- 前端跑通基础聊天页面

### 第二阶段

- 完成会话管理
- 补齐 SSE 事件模型
- 增加 agent 事件面板
- 做登录和用户隔离

### 第三阶段

- 引入数据库持久化
- 加入公网部署方案
- 加入 HTTPS、反向代理、审计日志
- 评估是否支持多用户共享实例

## 参考依据

本方案主要基于以下 OpenClaw 文档：

- `/usr/local/lib/node_modules/openclaw/docs/gateway/protocol.md`
- `/usr/local/lib/node_modules/openclaw/docs/zh-CN/web/control-ui.md`
- `/usr/local/lib/node_modules/openclaw/docs/gateway/openresponses-http-api.md`
- `/usr/local/lib/node_modules/openclaw/docs/gateway/remote.md`
- `/usr/local/lib/node_modules/openclaw/dist/plugin-sdk/gateway/protocol/schema/logs-chat.d.ts`

## 一句话总结

该项目的本质是：

- 前端：自定义聊天页面
- 后端：Gateway WebSocket 到 HTTP/SSE 的协议代理层
- Gateway：保持原样，继续作为 OpenClaw 的 AI 控制平面

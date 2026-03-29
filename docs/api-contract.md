# AIClawChannels API Contract

本文件以当前仓库代码为准，描述现阶段 backend 对外提供的 HTTP 和 SSE 契约。

适用代码范围：

- 路由定义：`backend/src/routes/*.ts`
- 共享类型：`packages/contracts/src/index.ts`
- 运行时行为：`backend/src/runtime/*.ts`、`backend/src/event-bus/*.ts`

当前仓库已经移除旧前端实现，因此本合同同时承担“新前端重建输入”的作用。

## 总体约束

- Base URL：`http://localhost:3001`
- 所有 JSON 时间字段均使用 ISO 8601 字符串
- 所有业务 API 都由 backend 暴露；前端不应直接访问 Gateway
- `sessionId` 是前端可见的业务 ID；backend 内部会映射成 `sessionKey`
- 失败响应目前统一为：

```json
{
  "error": "错误信息"
}
```

- 目前未实现统一错误码、鉴权头、分页参数和版本号前缀

## 数据模型

### SessionSummary

```json
{
  "id": "sess_001",
  "title": "默认会话",
  "agentId": null,
  "createdAt": "2026-03-11T12:00:00.000Z",
  "updatedAt": "2026-03-11T12:00:00.000Z",
  "lastMessagePreview": "你好，有什么需要处理？"
}
```

字段说明：

- `id`: 会话 ID
- `title`: 会话标题
- `agentId`: 预留字段，当前后端只透传/缓存，不驱动任何路由分支
- `createdAt`: 创建时间
- `updatedAt`: 最近更新时间
- `lastMessagePreview`: 会话列表摘要，可为空

### ChatMessage

```json
{
  "id": "msg_001",
  "role": "user",
  "text": "你好",
  "createdAt": "2026-03-11T12:00:00.000Z"
}
```

字段说明：

- `role`: `system | user | assistant`
- `text`: 已规整成纯文本后的消息正文

## Session API

### `GET /api/sessions`

返回当前可见会话列表。

响应 `200`：

```json
{
  "sessions": [
    {
      "id": "sess_001",
      "title": "默认会话",
      "agentId": null,
      "createdAt": "2026-03-11T12:00:00.000Z",
      "updatedAt": "2026-03-11T12:00:00.000Z",
      "lastMessagePreview": "你好，有什么需要处理？"
    }
  ]
}
```

当前行为说明：

- 返回结果按 `updatedAt` 倒序排列
- backend 会在每次查询前向 runtime 同步一次会话列表

### `POST /api/sessions`

创建一个新会话。

请求：

```json
{
  "name": "新的会话"
}
```

响应 `200`：

```json
{
  "id": "sess_002",
  "title": "新的会话",
  "agentId": null,
  "createdAt": "2026-03-11T12:00:00.000Z",
  "updatedAt": "2026-03-11T12:00:00.000Z",
  "lastMessagePreview": null
}
```

错误：

- `400`: `name` 缺失或为空白字符串

当前实现约束：

- `mock` 模式下直接创建内存会话
- `gateway` 模式下当前仍是 backend 本地创建会话元数据，没有调用独立的 Gateway “创建会话”接口

### `PATCH /api/sessions/:id`

更新会话元数据。

请求：

```json
{
  "title": "新的会话标题",
  "agentId": null
}
```

响应 `200`：

```json
{
  "id": "sess_001",
  "title": "新的会话标题",
  "agentId": null,
  "createdAt": "2026-03-11T12:00:00.000Z",
  "updatedAt": "2026-03-11T12:05:00.000Z",
  "lastMessagePreview": "你好，有什么需要处理？"
}
```

错误：

- `404`: 会话不存在

当前实现约束：

- `title`、`agentId` 都是可选字段
- 空 body 也会被接受，但本质上只会返回当前会话快照
- `gateway` 模式下只有 `title` 会尝试调用 `sessions.patch` 写回 Gateway；`agentId` 仍仅保存在 backend 内存中

## Chat API

### `GET /api/chat/history?sessionId=sess_001`

读取会话历史。

响应 `200`：

```json
{
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "text": "你好",
      "createdAt": "2026-03-11T12:00:00.000Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "text": "你好，有什么需要处理？",
      "createdAt": "2026-03-11T12:00:00.000Z"
    }
  ]
}
```

错误：

- `400`: 缺少 `sessionId`
- `404`: 会话不存在

当前行为说明：

- backend 会将 runtime/Gateway 返回的结构规整成 `ChatMessage[]`
- 当前只保留可提取纯文本的 `user` / `assistant` 消息

### `POST /api/chat/send`

向指定会话发送一条用户消息，并启动一次 run。

请求：

```json
{
  "sessionId": "sess_001",
  "message": "帮我总结一下当前项目",
  "clientRequestId": "req_001"
}
```

响应 `200`：

```json
{
  "accepted": true,
  "runId": "run_001"
}
```

错误：

- `400`: `sessionId`、`message`、`clientRequestId` 任一缺失或为空白字符串
- `404`: 会话不存在

当前行为说明：

- backend 会裁剪 `message` 和 `clientRequestId` 两端空白
- `clientRequestId` 在当前进程内按 `(sessionId, clientRequestId)` 做幂等去重
- 如果同一会话重复发送相同 `clientRequestId`，会直接返回第一次的 `runId`，不会再次下发消息

### `POST /api/chat/abort`

请求终止一个 run。

请求：

```json
{
  "sessionId": "sess_001",
  "runId": "run_001"
}
```

响应 `200`：

```json
{
  "accepted": true
}
```

错误：

- `400`: 缺少 `sessionId` 或 `runId`
- `404`: 会话不存在

当前行为说明：

- 当前响应只表示 backend 接受了“终止请求”
- 响应体不区分“run 已成功终止”和“run 本来就不存在/已结束”

## Stream API

### `GET /api/chat/stream?sessionId=sess_001`

建立指定会话的 SSE 连接。

错误：

- `400`: 缺少 `sessionId`
- `404`: 会话不存在

连接建立后，backend 会先写入：

```text
: connected
```

之后每 15 秒发送一次心跳：

```text
: heartbeat
```

当前行为说明：

- 单条 SSE 连接只会收到对应 `sessionId` 的事件
- backend 不提供 Last-Event-ID、游标恢复或事件重放
- 如果 Gateway 发来 `chat state=final` 但正文为空，backend 会补拉一次 `chat.history`，尽量回补 `message.final`

### 事件：`message.delta`

```text
event: message.delta
data: {"sessionId":"sess_001","runId":"run_001","delta":"正在分析...","createdAt":"2026-03-11T12:00:00.000Z"}
```

字段：

- `sessionId`
- `runId`
- `delta`: 当前增量文本
- `createdAt`

### 事件：`message.final`

```text
event: message.final
data: {"sessionId":"sess_001","runId":"run_001","message":{"id":"msg_003","role":"assistant","text":"这是最终结果","createdAt":"2026-03-11T12:00:01.000Z"},"createdAt":"2026-03-11T12:00:01.000Z"}
```

字段：

- `sessionId`
- `runId`
- `message`: 最终 assistant 消息
- `createdAt`

### 事件：`agent.event`

```text
event: agent.event
data: {"sessionId":"sess_001","runId":"run_001","stage":"thinking","message":"正在分析请求","createdAt":"2026-03-11T12:00:00.500Z"}
```

字段：

- `sessionId`
- `runId`
- `stage`: `thinking | tool | status`
- `message`
- `createdAt`

### 事件：`run.aborted`

```text
event: run.aborted
data: {"sessionId":"sess_001","runId":"run_001","createdAt":"2026-03-11T12:00:01.000Z"}
```

### 事件：`run.error`

```text
event: run.error
data: {"sessionId":"sess_001","runId":"run_001","error":"gateway chat run failed","createdAt":"2026-03-11T12:00:01.000Z"}
```

## Development-only API

### `POST /dev/sse-disconnect`

仅在 `NODE_ENV !== production` 时注册，用于本地模拟指定会话的 SSE 断开。

请求：

```json
{
  "sessionId": "sess_001"
}
```

响应 `200`：

```json
{
  "ok": true
}
```

错误：

- `400`: 缺少 `sessionId`

## 健康检查

### `GET /health`

响应 `200`：

```json
{
  "ok": true,
  "mode": "mock",
  "gatewayWsUrl": "ws://127.0.0.1:18789"
}
```

说明：

- `mode` 取值为 `mock` 或 `gateway`
- 该接口主要用于本地启动确认，不属于面向前端的业务契约

## 运行模式差异

### Mock mode

- 由 `MOCK_GATEWAY=true` 启用
- backend 不连接真实 Gateway
- 默认带一个种子会话 `sess_001`
- `POST /api/chat/send` 会模拟输出 `agent.event`、`message.delta`、`message.final`

### Gateway mode

- 由 `MOCK_GATEWAY=false` 启用
- backend 负责 Gateway 连接、鉴权、重连和事件映射
- 当前已接入的 Gateway 能力包括：
  - `sessions.list`
  - `sessions.patch`
  - `chat.history`
  - `chat.send`
  - `chat.abort`

## 当前未冻结的部分

以下内容在新前端重建阶段仍可能调整，因此不应提前写死到 UI 行为里：

- 认证/鉴权机制
- 持久化存储
- session 创建与 `agentId` 的持久化语义
- 分页、搜索、排序等会话管理能力
- 更细的错误码与可恢复策略

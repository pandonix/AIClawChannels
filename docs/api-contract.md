# AIClawChannels API Contract

本文件冻结 T0.2 的前后端契约，并作为后续 worktree 的联调依据。

## Session API

### `GET /api/sessions`

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

### `POST /api/sessions`

请求：

```json
{
  "name": "默认会话"
}
```

响应：

```json
{
  "id": "sess_002",
  "title": "默认会话",
  "agentId": null,
  "createdAt": "2026-03-11T12:00:00.000Z",
  "updatedAt": "2026-03-11T12:00:00.000Z",
  "lastMessagePreview": null
}
```

### `PATCH /api/sessions/:id`

请求：

```json
{
  "title": "新的会话标题",
  "agentId": null
}
```

## Chat API

### `GET /api/chat/history?sessionId=sess_001`

```json
{
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "text": "你好",
      "createdAt": "2026-03-11T12:00:00.000Z"
    }
  ]
}
```

### `POST /api/chat/send`

请求：

```json
{
  "sessionId": "sess_001",
  "message": "帮我总结一下当前项目",
  "clientRequestId": "req_001"
}
```

响应：

```json
{
  "accepted": true,
  "runId": "run_001"
}
```

### `POST /api/chat/abort`

请求：

```json
{
  "sessionId": "sess_001",
  "runId": "run_001"
}
```

响应：

```json
{
  "accepted": true
}
```

## Stream API

### `GET /api/chat/stream?sessionId=sess_001`

SSE 事件：

- `message.delta`
- `message.final`
- `agent.event`
- `run.aborted`
- `run.error`

示例：

```text
event: message.delta
data: {"sessionId":"sess_001","runId":"run_001","delta":"正在分析...","createdAt":"2026-03-11T12:00:00.000Z"}
```

```text
event: message.final
data: {"sessionId":"sess_001","runId":"run_001","message":{"id":"msg_003","role":"assistant","text":"这是最终结果","createdAt":"2026-03-11T12:00:01.000Z"},"createdAt":"2026-03-11T12:00:01.000Z"}
```

## Mock Strategy

T0.3 期间统一采用后端 mock provider：

- `MOCK_GATEWAY=true` 时，后端不连真实 Gateway
- `POST /api/chat/send` 会在内存里生成一条用户消息
- 后端用定时器模拟 `agent.event`、`message.delta`、`message.final`
- 前端默认连 mock backend，即可独立开发会话和聊天页面

真实 Gateway 对接完成后，只替换 backend provider，不修改前端契约。


# AIClawChannels 任务追踪

## 当前状态

MVP 核心链路已完成，所有并行开发分支已合并到 master。

联调结论（2026-03-11，mock runtime）：

- 正常链路通过：可稳定收到 `agent.event`、`message.delta`、`message.final`
- SSE 断线重连通过：重连后后续事件仍可继续接收
- 停止操作通过：活跃 run 可稳定收到 `run.aborted`
- 边界修补：`message.final` 在断线窗口内丢失时，前端在重连恢复后补拉 history 兜底

浏览器层面 E2E 联调已完成（2026-03-11，Playwright，mock runtime）：

- 10/10 场景全部通过，覆盖场景 1-6
- 修复了 SSE 路由 CORS 头缺失问题（`reply.raw` 绕过了 `@fastify/cors` hook）
- 新增 `EventBus.disconnectSession` 真正关闭 HTTP 连接（`reply.raw.destroy`）
- `e2e/` workspace：`@playwright/test`，`npm run test:e2e` 可直接运行

真实 Gateway 联调已完成（2026-03-11，OpenClaw Gateway）：

- `MOCK_GATEWAY=false` 时，后端可连接本地 OpenClaw Gateway
- 会话加载、历史消息、发送消息、停止操作已通过真实链路验证
- SSE 已确认可收到 `agent.event`、`message.final`、`run.aborted`
- 对真实 Gateway 做了兼容修补：`platform` 握手参数、agent 前缀 `sessionKey` 映射、`message.final` 空文本时回补 `chat.history`

---

## 剩余工作

### P3 — T2.F：持久化与认证（暂缓）

待 MVP 真实 Gateway 联调稳定后再开启：

- T2.F1：SQLite 持久化（会话、消息）
- T2.F2：用户认证与隔离
- T2.F3：部署样板（Docker、环境配置）

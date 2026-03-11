# AIClawChannels 开发任务拆解与 Worktree 并行方案

## 1. 拆解原则

本拆解基于 [docs/openclaw-web-channel-design.md](/Users/sunnyin/Documents/workspace/AIClawChannels-bootstrap/docs/openclaw-web-channel-design.md)。

并行开发的判断标准：

- 每个任务有明确输入、输出、边界和验收标准
- 每个任务尽量只改一个子目录或一组稳定接口，减少冲突面
- 先冻结契约，再并行实现，避免前后端反复对齐
- 串行阻塞项必须显式标注，不能假设“边做边定”

## 2. 范围结论

设计文档里有一处范围冲突：

- MVP 范围包含“用户登录”
- 分阶段实施建议把“登录和用户隔离”放在第二阶段

为了达到可并行开发标准，建议采用下面的落地口径：

- P0/P1 先完成“单用户可用”的端到端链路
- 登录体系先预留接口和中间件挂点，不作为第一批并行任务的阻塞项
- 用户登录和用户隔离作为 P2 独立工作流实现

## 3. 串行前置项

- T0.1 工程骨架与约定
- T0.2 接口契约冻结
- T0.3 开发假数据策略

## 4. 可并行开发主线

### Backend

- Track A: `gateway-client` 基础连接、重连、device token
- Track B: `chat-service`、`session-service`、HTTP API
- Track C: `event-bus`、SSE Stream

### Frontend

- Track D: 工程壳、会话列表、聊天区
- Track E: SSE 客户端、流式渲染、agent 事件面板

### 增强项

- Track F: SQLite、认证、部署收口

## 5. 已创建的 Worktree

- [AIClawChannels](/Users/sunnyin/Documents/workspace/AIClawChannels) -> `master`
- [AIClawChannels-bootstrap](/Users/sunnyin/Documents/workspace/AIClawChannels-bootstrap) -> `feat/bootstrap-contract`
- [AIClawChannels-backend-gateway](/Users/sunnyin/Documents/workspace/AIClawChannels-backend-gateway) -> `feat/backend-gateway-core`
- [AIClawChannels-backend-api](/Users/sunnyin/Documents/workspace/AIClawChannels-backend-api) -> `feat/backend-api-session`
- [AIClawChannels-backend-sse](/Users/sunnyin/Documents/workspace/AIClawChannels-backend-sse) -> `feat/backend-sse-events`
- [AIClawChannels-frontend](/Users/sunnyin/Documents/workspace/AIClawChannels-frontend) -> `feat/frontend-chat-shell`
- [AIClawChannels-frontend-stream](/Users/sunnyin/Documents/workspace/AIClawChannels-frontend-stream) -> `feat/frontend-streaming`
- [AIClawChannels-persistence-auth](/Users/sunnyin/Documents/workspace/AIClawChannels-persistence-auth) -> `feat/persistence-auth`

集成分支：

- `integration/mvp`

## 6. 每个 Worktree 的工作边界

### `feat/bootstrap-contract`

- 负责：
  - 根目录工程配置
  - `frontend/`、`backend/` 初始化
  - 共享契约、`.env.example`
  - mock 策略
- 不负责：
  - 复杂业务逻辑
  - 完整聊天 UI
  - 真正的 Gateway WS 实现

### `feat/backend-gateway-core`

- 重点目录：`backend/src/gateway/`
- 负责：Gateway 连接、握手、重连、device token

### `feat/backend-api-session`

- 重点目录：`backend/src/chat/`、`backend/src/sessions/`、`backend/src/routes/`
- 负责：会话服务、聊天服务、HTTP API

### `feat/backend-sse-events`

- 重点目录：`backend/src/event-bus/`
- 负责：事件订阅、SSE 连接管理、按 `sessionKey` 分发

### `feat/frontend-chat-shell`

- 重点目录：`frontend/src/pages/`、`frontend/src/components/`、`frontend/src/api/`
- 负责：会话栏、聊天壳、基础交互

### `feat/frontend-streaming`

- 重点目录：`frontend/src/lib/sse/`
- 负责：EventSource 封装、流式拼接、agent 事件展示

### `feat/persistence-auth`

- 重点目录：数据库 schema、repository、`auth-service`
- 负责：SQLite、认证、用户隔离

## 7. 合并顺序

合入 `integration/mvp` 的顺序：

1. `feat/bootstrap-contract`
2. `feat/backend-gateway-core`
3. `feat/backend-api-session`
4. `feat/backend-sse-events`
5. `feat/frontend-chat-shell`
6. `feat/frontend-streaming`
7. `feat/persistence-auth`

## 8. 协作规则

- `feat/bootstrap-contract` 先完成并合入 `integration/mvp`
- 其他分支开工前先同步契约
- 根配置、锁文件、`backend/src/app.ts`、共享 DTO 属于高冲突文件，只允许一个分支主改
- 改公共接口时先合到 `integration/mvp`，再通知其他分支 rebase
- 每个分支每天至少同步一次 `integration/mvp`

## 9. 当前前置工作状态

以下串行前置项已完成并已进入 `integration/mvp`：

- 工程骨架
- API/SSE 契约
- mock Gateway 策略

当前并行开发已不再受 `T0` 阶段阻塞，剩余工作集中在 `T1.A2` 收口与 MVP 联调验证。

## 10. 当前认领状态

- `feat/backend-gateway-core`：已完成 `T1.A1 + T1.A2`，并已合入 `integration/mvp`
- `feat/backend-api-session`：已完成 `T1.B2 + T1.B1 + T1.B3`
- `feat/backend-sse-events`：已完成 `T1.C1 + T1.C2`
- `feat/frontend-chat-shell`：已完成 `T1.D1 + T1.D2 + T1.D3`，并在 `integration/mvp` 收口历史消息、发送、停止与流式展示
- `feat/frontend-streaming`：已完成 `T1.E1 + T1.E2` 首版，并已合流 `integration/mvp`
- `feat/persistence-auth`：暂不建议优先推进 `T2.F1 + T2.F2`

## 11. 当前剩余工作

- 第一优先级：在 `integration/mvp` 上完成一次端到端联调，重点验证断线重连后 SSE 订阅、流式消息与停止操作是否仍然稳定
- 第二优先级：补齐 MVP 联调结论与回归清单，不启动 `T2.F1 + T2.F2 + T2.F3`

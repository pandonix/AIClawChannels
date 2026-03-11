# Code Review — AIClawChannels

> 审查时间：2026-03-11
> 审查范围：架构设计、代码质量、问题汇总
> 代码状态：MVP 核心链路已完成（mock runtime），E2E 10/10 通过

---

## 1. 架构设计评审

整体架构与设计文档高度吻合，分层清晰。

**亮点：**

- `BackendRuntime` 接口设计干净，Mock 和真实 Gateway 可无缝切换，`app.ts` 的装配点已预留好
- `BackendEventSource` 接口同样对称，`MockGatewayEventSource` 是一个薄适配器，职责单一
- `packages/contracts` 作为共享类型层，前后端共用同一套 DTO 和 SSE 事件类型，避免了类型漂移
- `SessionService` 维护 `sessionId → sessionKey` 映射，前端不感知 Gateway 内部 key，符合设计文档的隔离原则
- `GatewayConnectionManager` 实现了完整的重连、设备 token 缓存、状态持久化，已经超出 MVP 范围，为 T1.A3 打好了基础

**问题：**

**A1 — `BackendEventSource` 接口签名与实现不一致**

`event-bus/types.ts` 定义的接口：
```ts
subscribe(sessionId: string, sessionKey: string, listener: EventBusListener): () => void;
```

但 `event-bus/event-bus.ts` 调用时只传了两个参数：
```ts
subscription.teardown = this.eventSource.subscribe(session.id, (event) => { ... });
//                                                  ↑ sessionId   ↑ 这里传的是 listener，sessionKey 被跳过了
```

`MockGatewayEventSource` 用 `_sessionKey` 忽略了第二个参数，所以 mock 下不报错，但接口契约已经破坏。当 `GatewayEventSource` 实现时，`sessionKey` 是必须的，这个 bug 会在 T1.A3 时暴露。

**A2 — `app.ts` 硬编码了 Mock，`env.mockGateway` 没有被使用**

```ts
// app.ts
const mockGateway = buildMockGateway();
const runtime = new MockRuntime(mockGateway);
// ...
const eventBus = new EventBus({ eventSource: new MockGatewayEventSource(mockGateway) });
```

`loadEnv()` 返回的 `env.mockGateway` 只用在了 `/health` 路由的响应里，没有实际控制分支。`MOCK_GATEWAY=false` 时行为完全一样。这是 T1.A3 的遗留占位，但当前状态与 README 描述的"按 `MOCK_GATEWAY` 切换"不符，容易误导。

**A3 — `SessionService.listSessions` 每次都全量 sync**

```ts
async listSessions(): Promise<SessionSummary[]> {
  await this.hydrate();
  await this.syncSessionsFromRuntime(); // 每次都调用
  ...
}
```

`syncSessionsFromRuntime` 会 `clear()` 整个本地 Map 再重建。在 mock 下无感知，但接入真实 Gateway 后，每次列表请求都会发一次 RPC，且会丢失本地 `sessionKey` 缓存（虽然 `toRecord` 会从 existing 恢复，但 clear 后 existing 已经没了）。

实际上 `toRecord` 里有这段逻辑：
```ts
const existing = this.sessions.get(session.id);
return { ...session, sessionKey: existing?.sessionKey ?? this.sessionKeyFactory(session.id) };
```

但 `syncSessionsFromRuntime` 先 `clear` 再遍历，`existing` 永远是 `undefined`，`sessionKey` 每次都由工厂重新生成。对于 mock 来说工厂是幂等的，所以没问题，但这是一个隐患。

---

## 2. 代码质量评审

**亮点：**

- `GatewayClient` 的 TLS 指纹校验、`flushPending`、`failConnect` 处理完整，边界情况考虑周全
- `device-auth.ts` 的 Ed25519 签名实现干净，`buildDeviceAuthPayloadV3` 的 payload 格式明确
- `chat-stream.ts` 的重连逻辑（指数退避、closed 标志位、cleanup）写得规范
- `mergeMessages` 用 Map 去重再排序，逻辑正确
- E2E 测试的 helper 抽象合理，测试用例覆盖了断线重连、final 丢失兜底等关键边界场景

**问题：**

**Q1 — `chat/chat-service.ts` 的 `runsByClientRequestId` 永不清理，存在内存泄漏**

```ts
private readonly runsById = new Map<string, RunRecord>();
private readonly runsByClientRequestId = new Map<string, RunRecord>();
```

每次 `sendMessage` 都往两个 Map 里写入，但没有任何清理逻辑。长期运行后会无限增长。`abortRun` 只更新了 `status`，没有从 Map 里删除。

**Q2 — `mock-gateway.ts` 的 `timers` Map 同样不清理**

`sendMessage` 里：
```ts
this.timers.set(runId, timers);
```

`message.final` 触发后：
```ts
this.timers.delete(runId); // ✅ 正常完成时删了
```

但 `abortRun` 里：
```ts
this.timers.delete(runId); // ✅ abort 时也删了
```

这两处是对的。但 `runs` Map 和 `messages` Map 同样永不清理，mock 场景下影响不大，但值得注意。

**Q3 — `connection-manager.ts` 的 `connect()` 在 already-connected 时行为可疑**

```ts
async connect(): Promise<GatewayHelloOk> {
  if (this.state.phase === "connected" && this.client) {
    return this.client.connect(); // ← 调用 client.connect()，但 client 已经连上了
  }
  ...
}
```

`GatewayClient.connect()` 在 `helloOk` 存在时会直接返回，所以功能上没问题，但语义上应该直接返回 `this.state.lastHello!`，调用 `client.connect()` 是多余的绕路。

**Q4 — `stream.ts` 的 CORS 头是手动设置的，与 `@fastify/cors` 插件并存**

```ts
const origin = request.headers.origin;
if (origin) {
  reply.raw.setHeader("Access-Control-Allow-Origin", origin);
}
```

这是因为 SSE 用了 `reply.raw` 绕过了 Fastify 的响应生命周期，导致 `@fastify/cors` 的 hook 不生效，所以手动补了。这个 workaround 本身是合理的，但有两个小问题：
- 没有校验 `origin` 是否在白名单内，当前是无条件 echo，等同于 `Access-Control-Allow-Origin: *`
- 缺少 `Access-Control-Allow-Credentials` 等头，如果后续加认证会需要补

**Q5 — `workspace-page.tsx` 有多个 `useEffect` 监听重叠状态，逻辑分散**

页面里有 5 个 `useEffect`，其中 3 个都在处理 `activeRun` 的清除逻辑，分别监听：
- `streamState.finalMessages` → 清除 activeRun
- `streamState.notices` → 清除 activeRun
- `streamState.connectionState` → 触发 invalidate
- `historyMessages` → 清除 activeRun（history 兜底）

逻辑是正确的，但分散在多个 effect 里，维护时容易漏改。这是 MVP 阶段可以接受的，但后续应该考虑收拢到一个状态机或 reducer。

**Q6 — `api/client.ts` 的 `API_BASE_URL` 被 export，但 `chat-stream.ts` 直接 import 它**

```ts
// chat-stream.ts
import { API_BASE_URL } from "../../api/client";
```

SSE 的 URL 构建依赖了 API client 模块的内部常量，形成了跨层依赖。`chat-stream.ts` 作为一个通用 SSE 库，理应通过参数接收 URL，而不是直接 import 业务层的配置。

**Q7 — `use-chat-stream.ts` 的 agent events 上限是 `slice(-7)` 但语义是 8**

```ts
setAgentEvents((current) => [...current.slice(-7), payload]);
// 保留最后 7 条 + 新的 1 条 = 最多 8 条，逻辑正确
```

实际上是对的（slice(-7) 保留 7 条，加上新的共 8 条），但直接看代码会误以为上限是 7，可读性差。notices 同理（`slice(-4)` + 1 = 5 条）。

**Q8 — `session-sidebar.tsx` 有硬编码的 Track 标签**

```tsx
<span>Track</span>
<span>T1.D2</span>
```

这是开发期间的调试信息，不应该出现在生产 UI 里。

---

## 8. 问题汇总与改进建议

按优先级排列：

| 优先级 | 编号 | 位置 | 问题 |
|--------|------|------|------|
| ✅ 已修复 | A1 | `event-bus/types.ts` + `event-bus.ts` | `BackendEventSource.subscribe` 接口签名与调用不匹配，T1.A3 时必须修复 |
| ✅ 已修复 | A2 | `app.ts` | `env.mockGateway` 未实际控制分支，`MOCK_GATEWAY=false` 无效 |
| 🟡 中 | A3 | `sessions/session-service.ts` | `syncSessionsFromRuntime` 先 clear 再遍历，导致 `existing` 永远为 null，sessionKey 每次重新生成 |
| 🟡 中 | Q1 | `chat/chat-service.ts` | `runsById` / `runsByClientRequestId` 无清理，长期运行内存泄漏 |
| 🟡 中 | Q4 | `routes/stream.ts` | CORS origin 无白名单校验，等同于 `*` |
| 🟡 中 | Q6 | `lib/sse/chat-stream.ts` | 直接 import `API_BASE_URL`，跨层依赖 |
| 🟢 低 | Q3 | `gateway/connection-manager.ts` | already-connected 时调用 `client.connect()` 语义不清 |
| 🟢 低 | Q5 | `pages/workspace-page.tsx` | activeRun 清除逻辑分散在多个 effect |
| 🟢 低 | Q7 | `hooks/use-chat-stream.ts` | `slice(-7)` 可读性差，建议提取常量 |
| 🟢 低 | Q8 | `components/session-sidebar.tsx` | 硬编码 Track 标签 `T1.D2` 残留在 UI |

**A1 和 A2 已修复**，剩余问题不影响当前 mock 链路的正确性，可在后续迭代中逐步优化。

---

## 修复记录

### 2026-03-11 修复

**A1 — BackendEventSource 接口签名修复**
- 位置：`backend/src/event-bus/event-bus.ts:51`
- 修改：`this.eventSource.subscribe(session.id, session.sessionKey, (event) => { ... })`
- 状态：✅ 已修复，接口调用与定义一致

**A2 — app.ts 分支控制修复**
- 位置：`backend/src/app.ts:24-57`
- 修改：完整实现 `env.mockGateway` 三元分支，mock/gateway 模式可正确切换
- 状态：✅ 已修复，`MOCK_GATEWAY=false` 时正确使用 GatewayConnectionManager

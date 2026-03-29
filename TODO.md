# Frontend Rebuild TODO

本文件用于持续跟踪 AIClawChannels 前端重建工作，任务拆分基于 [docs/frontend-design-plan.md](docs/frontend-design-plan.md)、[docs/api-contract.md](docs/api-contract.md)、`packages/contracts/src/index.ts` 与当前仓库现状。

## 当前事实

- 当前仓库已建立 `frontend/` 工作区，并完成 M1 工程初始化基线。
- 根目录 `package.json` 的 frontend workspace 脚本已可运行，当前 `npm run build`、`npm run typecheck` 可通过。
- 当前前端只面向 desktop Web。
- 当前前端只对接 backend 暴露的 HTTP/SSE contract，不直接访问 Gateway。
- `e2e/` 里的场景可作为交互目标参考，但不能直接视为现成实现。

## 跟踪规则

- 一个复选框任务对应一个可独立提交的开发步。
- 每完成一个复选框任务，先更新本文件状态，再立刻提交一个 `git commit`。
- 单个 commit 只覆盖当前任务所需的最小变更，不把多个未完成任务混在一起。
- 若当前任务影响构建、类型或测试，提交前至少完成对应范围的验证，并把结果记入“进度记录”。
- commit message 建议格式：`feat(frontend): ...`、`chore(frontend): ...`、`test(frontend): ...`。

## 里程碑

### M0 跟踪基线

- [x] 建立前端重建 TODO 文件，明确任务顺序、完成标准与 commit 规则。

### M1 前端工程初始化

- [x] 创建 `frontend/` 工作区，完成 React + TypeScript + Vite 基础脚手架。
- [x] 接入 Tailwind CSS，并建立与设计方案一致的语义化颜色、字体、间距 token 基线。
- [x] 修复根工作区脚本与 `frontend` 包脚本，确保根目录 `npm run build`、`npm run typecheck` 具备可继续演进的前提。
- [x] 打通共享 TypeScript 配置与 `@contracts` 类型引用，建立 API Base URL 与运行环境配置。

### M2 应用基础设施

- [ ] 建立前端目录结构与核心基础层：`app shell`、路由入口、状态管理方案、请求封装、SSE 客户端封装。
- [ ] 建立统一的异步状态模型：loading、empty、error、reconnecting、activeRun，避免后续组件各自维护分裂状态。
- [ ] 建立基础 UI 原语与布局骨架：Top Bar、Chat Canvas、Composer、Drawer、Dialog、Popover 所需的通用组件封装。

### M3 会话域能力

- [ ] 实现会话列表读取与初始自动选中逻辑，对齐 `GET /api/sessions` 和“默认选中最新会话”规则。
- [ ] 实现 Sessions Drawer，支持会话列表展示、当前选中态、摘要与更新时间展示。
- [ ] 实现 New Session Modal，完成 `POST /api/sessions` 创建流程、创建态与失败反馈。
- [ ] 实现会话切换流程：切换会话时联动历史消息拉取、旧 SSE 关闭与新 SSE 重建。
- [ ] 实现 Session Settings Drawer 中的标题编辑与 `agentId` 编辑，对齐 `PATCH /api/sessions/:id`。

### M4 聊天主链路

- [ ] 实现聊天历史加载与消息列表渲染，覆盖空态、加载态、局部错误态。
- [ ] 实现 Composer 输入、发送按钮、`clientRequestId` 生成与 `POST /api/chat/send` 调用。
- [ ] 实现发送成功后的本地用户消息即时入列与 `activeRun` 状态切换。
- [ ] 实现流式 assistant live bubble，消费 `message.delta` 并在 UI 中持续增量展示。
- [ ] 实现 `message.final` 落地逻辑，将 live bubble 固化为正式 assistant 消息并恢复输入能力。
- [ ] 实现 `agent.event` 的轻量时间线/折叠区展示，保持其存在但不抢占聊天主区域。
- [ ] 实现 Stop 按钮与 `POST /api/chat/abort` 调用，在 `run.aborted` 到达后清理活动状态并插入 notice。
- [ ] 实现 `run.error` 展示与失败恢复策略，保证错误不会把页面推进到不可恢复状态。

### M5 SSE 稳定性与诊断

- [ ] 实现 SSE 连接状态展示：connecting、open、reconnecting、closed、error。
- [ ] 实现 SSE 断线自动重连，并确保重连后仍能继续接收后续 run 事件。
- [ ] 实现“delta 已到达但 final 丢失”场景的 history 补拉兜底，确保 live 状态最终收敛。
- [ ] 实现连接诊断浮层，展示最近一次错误、当前 sessionId、当前 runId 与连接状态。

### M6 视觉收口与验证

- [ ] 按设计方案收口桌面端视觉细节，确保聊天区是主视觉中心，管理能力隐入抽屉/浮层。
- [ ] 完成关键交互的可访问性与键盘操作校验，至少覆盖 Drawer、Dialog、Composer、发送/停止主链路。
- [ ] 更新或重建 e2e 用例，使其验证当前重建后的前端主链路，而不是依赖旧 DOM 结构。
- [ ] 补充前端运行说明与联调说明，确保新成员可按文档启动 frontend + backend。

## 完成标准

- M1 完成后，仓库具备可运行、可构建、可类型检查的前端工作区。
- M3 完成后，用户可以完成会话的读取、创建、切换、重命名与 `agentId` 编辑。
- M4 完成后，用户可以在主聊天界面完成发送、流式接收、停止 run 与错误感知。
- M5 完成后，SSE 中断与重连不再导致界面长期卡死，关键状态具备诊断入口。
- M6 完成后，前端达到可持续迭代的 MVP 基线，并具备基本验证与文档。

## 进度记录

- 2026-03-29: 初始化本 TODO，完成前端重建任务分解，并建立逐任务提交规则。
- 2026-03-29: 完成 M1 前端工程初始化，新增 `frontend/` React + TypeScript + Vite 工作区，接入 Tailwind CSS、`@contracts` 类型与 `VITE_API_BASE_URL` 配置；验证通过 `npm run typecheck`、`npm run build`。

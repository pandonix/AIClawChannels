# AIClawChannels Frontend 设计方案

本文档基于当前仓库中已实现的 backend 与共享 contract 制定，目标是在此前端完全缺失的前提下，先确定一版可执行的前端设计方案，作为后续实现基线。

事实来源：

- `backend/src/routes/*.ts`
- `backend/src/chat/chat-service.ts`
- `backend/src/sessions/session-service.ts`
- `backend/src/event-bus/event-bus.ts`
- `packages/contracts/src/index.ts`
- `docs/api-contract.md`

## 1. 项目目标

前端重建阶段只围绕当前已经稳定存在的能力展开：

- 会话列表读取、创建、更新标题
- 指定会话历史读取
- 发送消息、停止 run
- 基于 SSE 的流式响应展示
- SSE 断开、重连、错误提示
- 桌面端 Web 工作台体验

本阶段不提前设计后端尚未提供明确语义的复杂能力：

- 用户认证
- 多租户/权限体系
- 高级搜索、分页、归档
- `agentId` 的完整业务流程
- Gateway 直连能力
- 移动端适配

## 2. 设计原则

### 2.1 聊天优先

页面的视觉中心必须是聊天区，而不是管理区。用户进入页面后，应直接看到：

- 当前会话标题
- 消息流
- 输入框与发送/停止操作
- 当前 SSE 连接与 run 状态

其中“消息流”的优先级高于“输入器”和“管理控件”：

- 聊天消息区应占据页面的主要纵向空间
- 输入区应保持低存在感，只承担输入与发送职责
- 标题栏、状态栏、设置入口都应尽量轻量，不得压缩消息阅读区域

### 2.2 管理能力全部“隐入界面”

所有管理相关能力都不占据主布局的显式空间，只通过抽屉、弹窗、浮层进入：

- 会话列表与切换：左侧抽屉
- 新建会话：弹窗
- 会话标题编辑：抽屉内编辑，或标题区弹出层
- 会话设置：右侧抽屉
- 连接诊断/调试信息：底部浮层或弹窗

### 2.3 先对齐 contract，再做视觉扩展

UI 中出现的主要行为必须能直接映射到现有接口与 SSE 事件，不引入“按钮已经存在但后端不支持”的假功能。

### 2.4 视觉框架统一使用 Tailwind

前端样式体系统一基于 Tailwind CSS。建议搭配：

- React + TypeScript + Vite
- Tailwind CSS
- Radix UI 或 Headless UI 负责 Dialog / Sheet / Popover 等无样式交互原语
- `clsx` / `tailwind-merge` 管理 class 组合

说明：Tailwind 负责视觉框架；抽屉、弹窗等交互原语建议复用成熟 headless 方案，降低从 0 实现复杂交互的成本。

### 2.5 当前阶段只做桌面端

本阶段前端方案仅面向 desktop Web：

- 设计、布局、交互优先按桌面端视口定义
- 不投入移动端适配与手势设计
- 不为移动端额外牺牲桌面聊天区的空间效率

## 3. 视觉方向

## 3.1 整体气质

建议采用“主流聊天应用桌面工作区”方向，并结合当前项目的运行态特征做收敛：

- 深色中性底色，突出内容发光层次
- 高对比但克制的强调色，只服务于状态与主操作
- 大面积留白留给消息流与输入区
- 管理入口缩成少量图标按钮，避免固定侧栏占宽

可参考的不是“后台系统”视觉，而是主流聊天应用在桌面端的共性：

- 视觉重心持续落在消息阅读与生成过程
- 顶部控制条很轻
- 输入器存在感低，但交互明确
- 附加信息通过抽屉、浮层、菜单逐层展开

这套方向与当前产品形态匹配，因为系统核心是“单会话内的人机交互过程”，不是“后台管理台”。

## 3.2 色彩建议

建议使用 CSS 变量驱动 Tailwind 语义色：

- 背景主色：深石墨色或蓝黑色
- 聊天气泡：用户侧偏亮、助手侧偏暗
- 强调色：青蓝或冷绿，只用于发送按钮、流式状态、选中态
- 风险色：橙色用于重连，红色用于错误

避免：

- 大面积高饱和渐变
- 管理后台式灰白分栏
- 长期占位的粗重边栏

## 3.3 字体与层次

- 标题与数字状态使用更有识别度的展示字体
- 正文与消息内容使用高可读性无衬线字体
- 聊天内容字号适中，状态字号更小、更轻
- 输入区与最近消息区域对比更强，形成视觉焦点

## 4. 信息架构

前端采用单页聊天工作台，不做传统“左侧管理导航 + 右侧内容区”的后台布局。

### 4.1 主界面结构

```text
┌─────────────────────────────────────────────┐
│ Top Bar                                     │
│ [Sessions]  当前会话标题  SSE状态  [设置]    │
├─────────────────────────────────────────────┤
│ Chat Canvas                                 │
│ - 历史消息                                  │
│ - streaming live bubble                     │
│ - agent activity inline strip / fold panel  │
├─────────────────────────────────────────────┤
│ Composer                                    │
│ [输入框.........................][Stop][Send]│
└─────────────────────────────────────────────┘
```

主界面只保留三个强感知区域：

- 顶部轻量控制条
- 中央聊天画布
- 底部输入区

空间分配原则：

- 中央聊天画布是绝对主区域
- 顶部条仅保留一行高度
- 底部输入区采用紧凑型布局，不做大面积固定面板
- Top Bar 和 Composer 都必须“收着做”，不能为了展示控制项而压缩 Chat Canvas

### 4.2 抽屉/弹窗布局

#### 左侧抽屉：Sessions Drawer

承载：

- 会话列表
- 新建会话入口
- 当前选中会话高亮
- 会话摘要与更新时间
- 快速重命名入口

不在主界面长期展开。默认关闭，通过顶部 `Sessions` 按钮或快捷键呼出。

#### 右侧抽屉：Session Settings Drawer

承载：

- 会话标题编辑
- `agentId` 字段查看/编辑
- 连接说明、当前 sessionId
- 后续可扩展的高级配置

`agentId` 当前后端仅缓存透传，因此 UI 上应标记为“预留字段/实验字段”，不要包装成成熟能力。

#### 弹窗：New Session Modal

承载：

- 新会话名称输入
- 创建确认
- 创建中状态
- 创建失败反馈

#### 浮层：Connection / Run Diagnostics

承载：

- SSE 当前状态
- 最近一次错误
- 重连中提示
- 可选的最近一次 runId

默认隐藏，仅在点击状态 pill 或发生异常时展示。

## 5. 关键交互流程

## 5.1 初始进入

1. 页面启动后先请求 `GET /api/sessions`
2. 若有会话：
   - 自动选中最新更新的一条
   - 拉取 `GET /api/chat/history`
   - 建立 `GET /api/chat/stream?sessionId=...`
3. 若无会话：
   - 显示空态聊天画布
   - 引导用户通过弹窗创建第一条会话

## 5.2 切换会话

1. 用户打开左侧抽屉
2. 选择目标会话
3. 主界面更新标题与历史消息
4. 关闭旧 SSE，建立新会话 SSE
5. 若连接中断或历史拉取失败，在聊天区内给出局部错误态，不跳走页面

## 5.3 发送消息

1. 用户在底部输入框输入内容
2. 前端生成 `clientRequestId`
3. 调用 `POST /api/chat/send`
4. 消息成功受理后：
   - 立即将用户消息加入本地消息流
   - 进入 `activeRun` 状态
   - `Stop` 按钮可用
   - 输入框可按策略锁定为只读
5. 随 SSE 到达逐步更新 live assistant bubble
6. 收到 `message.final` 后：
   - live bubble 落地为正式 assistant 消息
   - 清除 `activeRun`
   - 重新允许输入

输入区设计要求：

- 默认保持单行或低高度输入状态
- 只在长文本输入时温和扩展高度
- 不使用大块说明区、工具区或永久提示区
- 不让输入器在视觉上与消息流竞争
- Composer 的高度控制应作为硬约束，而不是视觉建议

## 5.4 中止 run

1. 用户点击 `Stop`
2. 调用 `POST /api/chat/abort`
3. 接收到 `run.aborted` 后：
   - 结束 live 状态
   - 在消息流中插入轻量 notice
   - 清除 `activeRun`

注意：当前 contract 只能表达“终止请求已被接受”，不能保证服务端一定终止成功，因此前端仍应以 SSE 事件作为最终状态依据。

## 5.5 SSE 断开与恢复

当前 backend 不支持游标恢复或事件重放，因此前端策略应为：

- 断开后自动重连当前会话 SSE
- 重连成功后补拉一次 `GET /api/chat/history`
- 若发现 live run 已消失但 history 中新增 assistant 消息，则以前者为准完成兜底

这部分是前端必须实现的补偿逻辑，否则 `message.final` 在断线窗口丢失时，界面可能永久停留在“生成中”。

## 6. 页面与组件方案

## 6.1 页面级划分

仅保留一个主页面即可：

- `/`

页面内部用状态切换不同视图，而不是拆多路由。

原因：

- 现阶段功能高度集中在单会话聊天
- backend 也没有提供需要单独页面承载的管理模块
- 多路由会放大状态同步成本

## 6.2 核心组件树

```text
AppShell
  ChatWorkspacePage
    TopBar
      SessionsTrigger
      SessionTitle
      SseStatusPill
      SessionSettingsTrigger
    ChatCanvas
      WelcomeEmptyState
      MessageList
        UserMessageCard
        AssistantMessageCard
        LiveMessageCard
        NoticeMessageCard
      AgentActivityStrip
    Composer
      MessageTextarea
      StopButton
      SendButton
    SessionsDrawer
      SessionList
      SessionListItem
      NewSessionButton
    NewSessionModal
    SessionSettingsDrawer
    DiagnosticsPopover
```

## 6.3 聊天区设计重点

聊天区是唯一应持续占据大面积空间的区域，重点如下：

- 消息流宽度控制在适合长文本阅读的范围
- 最近消息自动滚动，但用户上滑查看历史时不强制抢焦点
- live 消息与 final 消息视觉连续，避免“断层感”
- `agent.event` 不采用占满一列的大时间轴，可采用更轻的 inline activity strip
- 输入区与顶部控制条都不能挤压聊天区的阅读高度
- Top Bar 与 Composer 应被视为“附属操作层”，Chat Canvas 才是主画布

建议形式：

- 在 live 消息上方显示一条窄活动条
- 按 `thinking / tool / status` 切换小图标与颜色
- 默认只显示最近几条 agent event
- 详细日志通过浮层展开，而不是常驻大侧栏

这样可以突出聊天主线，而不是把注意力分散到运行日志面板。

## 7. 状态模型

## 7.1 前端领域状态

建议至少拆出以下状态域：

### sessions

- `items`
- `selectedSessionId`
- `isLoading`
- `isCreating`
- `isPatching`

### messages

- `historyBySessionId`
- `liveMessageBySessionId`
- `agentEventsBySessionId`
- `isHistoryLoading`

### runs

- `activeRunIdBySessionId`
- `pendingClientRequestId`
- `lastAbortedRunId`
- `lastErroredRun`

### stream

- `connectionState: idle | connecting | open | reconnecting | error`
- `reconnectAttempt`
- `lastEventAt`

### overlays

- `isSessionsDrawerOpen`
- `isNewSessionModalOpen`
- `isSettingsDrawerOpen`
- `isDiagnosticsOpen`

## 7.2 推荐状态管理方式

建议：

- 远程数据缓存：TanStack Query
- 本地交互状态：Zustand 或 React Context + reducer

理由：

- 会话列表、历史消息天然适合 query/mutation 模式
- SSE live 状态与 overlay 开关更适合本地 store

## 8. API 与前端行为映射

| 后端能力 | 前端用途 | UI 落点 |
|------|------|------|
| `GET /api/sessions` | 加载会话列表 | Sessions Drawer |
| `POST /api/sessions` | 新建会话 | New Session Modal |
| `PATCH /api/sessions/:id` | 更新标题、预留 `agentId` | Settings Drawer |
| `GET /api/chat/history` | 拉取聊天历史 | Chat Canvas |
| `POST /api/chat/send` | 发送消息 | Composer |
| `POST /api/chat/abort` | 停止 run | Composer / Top Bar |
| `GET /api/chat/stream` | 接收流式事件 | Chat Canvas |

## 9. 响应式策略

当前阶段只定义 Desktop。

## 9.1 Desktop

- 顶部条保持轻量
- 聊天区居中，最大宽度受控
- 抽屉宽度可稍大，便于会话浏览与配置编辑
- Composer 保持紧凑高度，避免侵占消息区
- 不做移动端断点策略，不为小屏重排投入设计成本

## 10. 视觉与交互细节规范

### 10.1 SSE 状态表现

顶部状态 pill 至少区分：

- `Connecting`
- `Open`
- `Reconnecting`
- `Error`

配色建议：

- `Open`: 冷绿
- `Connecting/Reconnecting`: 琥珀
- `Error`: 红

### 10.2 Top Bar 约束

- Top Bar 只承载最必要的入口：会话入口、当前标题、状态 pill、设置入口
- 保持单行、低高度，不放置次级说明文案
- 不引入第二行工具栏，不堆叠筛选、统计或管理按钮
- 一旦顶部信息过多，应优先折叠到抽屉或浮层，而不是增加栏位高度

### 10.3 消息气泡规范

- 用户消息靠右，强调输入动作
- assistant 消息靠左，信息密度更高
- system/notice 消息不做普通气泡，采用细条提示卡
- 整体视觉重心始终围绕消息流，不让按钮、表单、设置模块夺走注意力

### 10.4 输入区规范

- 输入区高度应被严格控制在“够用”范围
- 发送、停止按钮以紧凑操作位存在，不做大面积主视觉按钮
- 输入框容器可做悬浮或贴底设计，但视觉重量要低于消息卡片
- 输入区上方不放置永久工具栏、复杂筛选或管理表单
- 不增加第二层 composer header、prompt 库面板或常驻参数面板
- 如需扩展输入相关能力，应优先通过弹窗、popover 或按需展开处理

### 10.5 空态

无会话或无消息时，空态应把用户引导到“开始对话”，而不是展示管理说明。建议展示：

- 一句简洁说明
- 一组可点击的建议提示词
- 新建会话入口

### 10.6 错误态

错误应优先局部化处理：

- 历史加载失败：在聊天区内显示 retry
- 发送失败：保留输入内容并提示重试
- SSE 错误：状态 pill 变色 + toast + 自动重连

避免直接跳出整页错误页。

## 11. 目录与工程建议

建议新建 `frontend/`，采用以下结构：

```text
frontend/
  src/
    app/
    components/
    features/
      sessions/
      chat/
      stream/
      overlays/
    lib/
      api/
      sse/
      utils/
    styles/
  public/
```

建议 feature 划分：

- `sessions`: 会话列表、创建、更新
- `chat`: 消息历史、发送、停止、消息渲染
- `stream`: SSE 建连、事件分发、重连
- `overlays`: 抽屉、弹窗、浮层状态

## 12. 测试策略

旧前端 e2e 场景不再作为设计输入，但 Playwright 这类工具仍建议保留。

推荐测试分层：

- 单元测试：消息归并、SSE 事件 reducer、状态转换
- 组件测试：Composer、MessageList、Session Drawer
- Playwright e2e：新建会话、发送消息、流式展示、停止 run、SSE 重连

测试目标应围绕新前端方案重写，而不是追随旧页面结构。

## 13. 分阶段实施建议

### Phase 1：可联调骨架

- 初始化 React + Vite + Tailwind
- 落主页面骨架
- 接 `GET /api/sessions`
- 接 `GET /api/chat/history`
- 完成 Sessions Drawer 与 Chat Canvas 基础展示

### Phase 2：聊天闭环

- 接 `POST /api/chat/send`
- 接 `GET /api/chat/stream`
- 实现 live message、final 落地、Stop
- 完成 SSE 状态 pill

### Phase 3：管理浮层完善

- New Session Modal
- Session Settings Drawer
- 标题更新
- `agentId` 预留编辑

### Phase 4：稳定性与体验

- SSE 自动重连
- history 补拉兜底
- 错误提示与 toast
- Playwright 回归

## 14. 本方案的最终落点

这版前端应呈现为一个“聊天工作台”，而不是“管理后台”：

- 主界面几乎全部空间让给聊天交互
- 消息流是第一视觉主体，输入区与控制区都应降权处理
- 管理动作全部收敛到抽屉、弹窗和浮层
- 仅面向桌面端，不在当前阶段处理移动端
- 视觉语言参考主流聊天应用，而不是传统管理系统
- 前端状态机直接对齐当前 backend 与 SSE contract
- 为后续功能扩展预留位置，但不提前虚构后端能力

后续若开始实施，可直接按本文档的 Phase 顺序从 `frontend/` 目录搭建。

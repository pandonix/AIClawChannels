# 前端重构计划

## 文档目的

本计划用于指导下一阶段前端重构开发。

它合并了三部分信息：

- 旧版 `frontend-refactor-plan` 中已经完成的布局改造背景
- `frontend-visual-audit.md` 中通过代码审阅和真实浏览器巡检发现的问题
- 对源码的二次深度审查，补充了聊天体验、内容渲染、交互反馈、性能和代码组织层面的额外问题

从本文件开始，前端重构不再以”描述已经做了什么”为主，而是以”下一步要如何系统重构并完成验收”为主。

## 结论

当前前端适合进行一次以 Tailwind 为核心的样式层重构，并借这次重构一并解决以下问题：

- 移动端布局骨架不成立
- 设置抽屉在小屏下没有完成表单重排
- 页面语言系统混杂
- 空状态、禁用态、操作层级不完整
- 字体、状态 token、动效和可访问性缺乏统一规范
- `styles.css` 过大且职责混杂，已经成为后续迭代的主要阻力
- 聊天核心体验缺失：消息无自动滚动、无 Markdown 渲染、Streaming 无视觉反馈
- Composer 区域占比过大且色调与主体割裂
- Timeline rail 信息密度低，在中等屏幕上浪费空间
- 内联 SVG 图标散落各组件，缺乏统一管理
- 抽屉 footer 存在无功能的假按钮，损害产品信任感
- Session 列表缺少时间分组和视觉层次
- 状态切换缺少 loading skeleton 和过渡动画
- 背景 blur 效果在低端设备上存在性能隐患

换句话说，这次重构的目标不是”把 CSS 改写成 Tailwind”，而是”借 Tailwind 重建前端样式系统，修复上一轮走查暴露的结构性问题，并补齐聊天产品应有的核心交互体验”。

## 对旧方案的复盘

## 旧方案已经覆盖的目标

旧方案的以下目标仍然成立，并且应保留：

- 引入 `NavigationRail + ChatShell + Drawer` 的工作台结构
- 将配置能力从聊天头部迁移到独立抽屉
- 将 Session 列表改为独立面板
- 保留 SSE 状态、Live Logs、Session 管理和聊天主链路
- 将配置区域做成模块化折叠卡片，便于后续扩展

这些内容说明旧方案在“信息分区”上方向是对的，不需要推翻重来。

## 旧方案没有覆盖或覆盖不足的目标

旧方案没有真正覆盖下面这些问题，甚至有些判断已经被本轮视觉走查证伪：

- “响应式友好”并未成立，移动端只是把桌面结构压缩了
- “极致简洁”只对桌面端部分成立，对移动端反而造成首屏浪费
- `title` 属性不等于完整可访问性
- 抽屉、空状态、按钮态仍然是桌面思维的样式延伸，不是完整的交互方案
- 文案统一、字体策略、焦点态、动效降级都没有纳入旧方案的核心目标
- 样式实现仍以超大 `styles.css` 为中心，没有建立可扩展的组件化样式体系
- 作为聊天产品的基础体验完全缺失：消息不会自动滚动到底部、assistant 回复以纯文本渲染（无 Markdown 支持）、streaming 过程没有打字机效果或视觉反馈
- Composer 区域最小高度 8rem，在笔记本屏幕上严重挤压消息阅读区；深色背景与浅色主体之间缺少过渡，视觉割裂
- Timeline rail 固定 160px 宽，无事件时大量留白，在 1080-1280px 常见笔记本屏幕区间仍在挤压消息区
- 所有图标均为手写内联 SVG，同一图标在不同组件中重复出现，尺寸和 strokeWidth 不一致
- 抽屉 footer 的 “Reset to Default” 和 “Save Changes” 按钮没有绑定任何事件，是无功能的假按钮
- Session 列表没有时间分组、没有搜索过滤、没有活跃状态的视觉区分
- 页面加载和状态切换缺少 loading skeleton 和过渡动画，状态跳变生硬
- 背景双层 blur（`filter: blur(40px)` + `backdrop-filter: blur(24px)`）在低端设备上存在渲染性能隐患

因此，本次重构必须把”布局升级”、”样式系统重构”和”聊天核心体验补齐”绑定在一起推进。

## 重构范围

本次重构限定在 `frontend/`，但不只是视觉皮肤修改，范围包括：

- 页面布局骨架
- 组件级样式组织方式
- 设计 token
- 响应式策略
- 文案系统统一
- 可访问性和动效收口
- 无用组件和旧样式清理
- 聊天核心体验：消息自动滚动、Markdown 渲染、Streaming 视觉反馈
- Composer 区域高度策略与色调过渡
- Timeline rail 可折叠化
- 内联 SVG 图标统一管理
- 无功能按钮修复或移除
- Session 列表信息层次与分组
- Loading skeleton 与状态过渡动画
- 背景 blur 性能降级策略

不包含以下内容：

- 后端接口改造
- React Query 数据流重写
- 聊天业务逻辑重做
- 新增复杂业务配置能力

## 重构目标

### 1. 样式架构目标

- 使用 Tailwind 接管大部分组件样式、布局、断点和状态表达
- 将当前 `styles.css` 从“大而全的组件样式文件”收缩为“少量全局样式入口”
- 用统一 token 替代散落在组件和 CSS 中的硬编码颜色、阴影、圆角、间距和值

### 2. 布局与响应式目标

- 保留桌面端工作台结构，但重做移动端骨架
- 移动端不再直接复用桌面 Navigation Rail 的信息层级
- 抽屉和表单在小屏下必须重新组织，而不是仅调整宽度
- Timeline rail 改为可折叠或按需展开，避免在无事件时浪费空间
- Composer 区域默认收紧高度，聚焦时再展开，不再固定 8rem 最小高度挤压消息区

### 3. 视觉一致性目标

- 统一界面主语言
- 统一字体策略
- 统一按钮、卡片、状态标签、输入框、抽屉等基础视觉语言
- 为空状态、错误状态、禁用态提供更明确的表达
- Composer 深色背景与浅色主体之间建立色调过渡，消除视觉割裂
- Session 列表引入时间分组和活跃状态视觉区分
- 页面加载和状态切换引入 loading skeleton，消除生硬跳变

### 4. 聊天核心体验目标

- 消息列表支持自动滚动到底部，新消息到来时自动跟随，用户手动上滚时暂停跟随
- Assistant 回复支持 Markdown 渲染，至少覆盖代码块高亮、列表、加粗、链接
- Streaming 过程提供打字机效果或尾部闪烁光标，让用户明确感知"正在生成"
- 移除或修复抽屉 footer 中无功能的假按钮，避免损害产品信任感

### 5. 质量目标

- 补齐 `focus-visible`
- 支持 `prefers-reduced-motion`
- 提升图标按钮、开关、抽屉操作的可访问性
- 清理未使用组件和过时样式
- 背景双层 blur 在 reduced motion 或低端设备下降级
- 内联 SVG 图标收口为统一的 Icon 组件或图标库，消除跨组件重复和不一致

## 核心问题到重构动作的映射

### 问题 1：移动端导航占据首屏

重构动作：

- 桌面端保留 rail
- 移动端改为顶部操作条或更轻量的入口结构
- 历史与设置入口降级为二级操作，不再占据首屏主要空间

### 问题 2：移动端抽屉表单拥挤

重构动作：

- 抽屉内容改为真正的移动优先表单布局
- `.config-value` 在移动端纵向堆叠
- `Save`、`Copy` 等操作不再硬贴输入框右侧
- footer 改为更轻的 sticky action 区或按需显示

### 问题 3：中英文混杂

重构动作：

- 明确当前产品主语言为中文
- 页面级文案统一收口
- 为后续国际化预留文案资源结构，但本轮不实现完整 i18n

### 问题 4：空状态无引导

重构动作：

- 空状态单独设计布局，而不是复用消息列表布局
- 空状态下弱化 timeline
- 为首屏提供明确的下一步动作和示例提示

### 问题 5：按钮禁用态弱

重构动作：

- 建立统一的按钮体系和状态语义
- 区分主按钮、次按钮、幽灵按钮、危险按钮、禁用态
- 在移动端重新定义 composer 操作区层级

### 问题 6：字体和视觉 token 不稳定

重构动作：

- 统一字体策略并显式加载
- 建立颜色、阴影、圆角、边框、间距 token
- 不再在组件内随意散落原始视觉值

### 问题 7：可访问性和动效缺失

重构动作：

- 为所有交互控件提供清晰焦点态
- 抽屉和面板动效支持 reduced motion
- 图标按钮补齐可访问名称
- 开关实现回到可访问的表单控件模式

### 问题 8：消息列表无自动滚动

现状：`message-stage__list` 是 `overflow: auto` 容器，但代码中没有任何 `scrollIntoView` 或 `scrollTop` 逻辑。新消息到来时用户必须手动滚动才能看到最新内容。

重构动作：

- 在消息列表末尾添加 scroll anchor ref
- 新消息或 streaming delta 更新时自动 scroll to bottom
- 检测用户是否手动上滚，如果上滚则暂停自动跟随，并显示"回到底部"浮动按钮

### 问题 9：消息内容无 Markdown 渲染

现状：`chat-shell.tsx` 中消息内容直接用 `<p>{message.text}</p>` 渲染纯文本。作为 AI 聊天工作台，assistant 回复几乎一定包含代码块、列表、标题等 markdown 内容，当前全部被当作纯文本展示。

重构动作：

- 引入轻量 markdown 渲染库（如 `react-markdown`）
- 至少支持代码块（含语法高亮）、列表、加粗、斜体、链接
- 为渲染后的 markdown 内容建立统一的排版样式（行高、间距、代码块背景等）

### 问题 10：Streaming 过程缺少视觉反馈

现状：streaming run 的消息卡片有 `message-card--live` 样式（淡蓝渐变背景），但没有任何动态视觉反馈——没有光标闪烁、没有渐入动画、没有 loading skeleton。用户难以感知"正在生成"。

重构动作：

- 给 live 消息尾部添加闪烁光标动画（CSS animation）
- 或为 streaming 卡片添加 pulse/breathing 动画
- "Waiting for delta..." 状态使用 skeleton placeholder 替代纯文本

### 问题 11：Composer 区域占比过大且色调割裂

现状：chat-shell 的 grid 定义 `grid-template-rows: auto minmax(8rem, 1fr) minmax(8rem, auto)` 给 composer 设置了 8rem 最小高度，内部 textarea `min-height: 5.5rem`。在笔记本屏幕上 header + timeline + composer 可能占掉一半以上视口。同时 composer 使用 `rgba(31, 38, 47, 0.97)` 近乎纯黑背景，与暖白色主体之间没有过渡。

重构动作：

- Composer 默认收紧到 2-3 行高度，聚焦时自动展开
- `minmax(8rem, auto)` 改为 `auto`，让 textarea 按内容自适应
- 调整 composer 背景色调，或在过渡区域加渐变缓冲，减少与主体的割裂感

### 问题 12：Timeline rail 信息密度低

现状：timeline rail 固定 160px 宽，无事件时只有一行 "Waiting for agent events"，大量留白。在 1080px 以下已改为单列，但 1080-1280px 常见笔记本屏幕区间仍在挤压消息区。

重构动作：

- 将 timeline 改为可折叠侧栏或底部抽屉，默认收起
- 有事件时自动展开或通过 badge 提示用户展开
- 无事件时不占据固定列宽

### 问题 13：内联 SVG 图标缺乏统一管理

现状：所有组件中的图标都是手写内联 SVG，每个图标是一大段 `<svg>` 标签。同一图标（如关闭按钮 X）在不同组件中重复出现，尺寸和 strokeWidth 可能不一致。

重构动作：

- 抽取统一的 Icon 组件，或引入 `lucide-react` 等图标库
- 在 Phase 1 的 UI primitives 中一并完成图标收口
- 确保所有图标尺寸、strokeWidth、颜色继承规则一致

### 问题 14：抽屉 footer 存在无功能的假按钮

现状：`workspace-drawer.tsx` 底部 "Reset to Default" 和 "Save Changes" 两个按钮没有绑定任何 onClick 事件，也没有 disabled 逻辑。用户点击后什么都不会发生，制造"功能坏了"的印象。

重构动作：

- 如果功能已规划，接上真实逻辑
- 如果功能未实现，移除这两个按钮，或加 `disabled` + tooltip 说明"即将推出"
- 不允许界面上存在无响应的可点击元素

### 问题 15：Session 列表缺少视觉层次

现状：session-panel 中所有 session 卡片样式完全一致，没有按时间分组（今天/昨天/更早），也没有未读或活跃状态的明显视觉区分。session 数量增多后列表变成一堵墙。

重构动作：

- 引入时间分组标题（今天、昨天、更早）
- 给当前活跃 session 加更明显的标记（不只是边框颜色变化）
- 考虑加入 session 搜索或过滤能力

### 问题 16：缺少 loading skeleton 和过渡动画

现状：页面加载、session 切换、历史消息拉取时只有纯文本提示（"Loading history..."、"Loading sessions..."）。没有 skeleton screen，没有 fade 过渡，状态切换生硬。

重构动作：

- 为消息列表和 session 列表加入 skeleton placeholder
- 为面板切换加入 fade/slide 过渡动画
- 在 Phase 6 的动效收口中统一处理

### 问题 17：背景 blur 效果存在性能隐患

现状：`workspace-glow` 使用 `filter: blur(40px)` 大面积模糊，`workspace-grid` 使用 `backdrop-filter: blur(24px)`。两层 blur 叠加在低端设备或大屏上可能造成明显渲染开销和掉帧。

重构动作：

- 在 `prefers-reduced-motion` 下降级或移除 blur 效果
- 考虑对低端设备检测后降级为纯色背景
- 在 Phase 6 的动效收口中统一处理

## Tailwind 重构策略

## 为什么使用 Tailwind

当前前端的典型问题是：

- 组件数量不多，但样式体量已经很大
- 视觉规则已经形成，却没有被系统化
- JSX 与样式定义距离过远
- 响应式和状态表达需要更细粒度的组件级控制

Tailwind 在这里的价值不是“减少 CSS”，而是：

- 让布局和状态表达回到组件附近
- 促使 token 和组件视觉边界清晰化
- 减少全局样式文件持续膨胀
- 让响应式重排更直接、更可审阅

## Tailwind 的使用边界

本次不建议把所有样式都写成超长 `className`，也不建议完全消灭全局 CSS。

建议边界如下：

- Tailwind 负责：
  - 布局
  - 间距
  - 尺寸
  - 响应式断点
  - 大部分颜色、边框、阴影、圆角
  - 交互状态
- 少量全局样式负责：
  - 字体导入
  - 根背景
  - 滚动条
  - `:focus-visible` 基础规则
  - `prefers-reduced-motion`
  - 必要的全局 reset

## 推荐的组件组织方式

建议引入一层轻量 UI primitives，而不是在页面组件内堆砌大量重复 utility。

优先抽取：

- `Button`
- `IconButton`
- `Icon`（统一图标组件，替代散落各处的内联 SVG）
- `Input`
- `Textarea`
- `Panel`
- `Drawer`
- `StatusPill`
- `SectionCard`
- `Skeleton`（loading skeleton placeholder）
- `MarkdownRenderer`（轻量 markdown 渲染，封装 `react-markdown` + 代码高亮）
- `ScrollAnchor`（消息列表自动滚动锚点 + "回到底部"浮动按钮）
- `StreamingCursor`（streaming 打字机闪烁光标）

页面组件继续保留业务语义：

- `NavigationRail`
- `ChatShell`
- `SessionPanel`
- `WorkspaceDrawer`
- `WorkspacePage`

## 设计系统约束

本轮重构需要先冻结一版基础设计规则。

### 颜色

- 主色：暖橙，用于主要 CTA 和品牌强调
- 辅色：蓝绿，用于连接状态、日志、技术辅助信息
- 中性色：深灰与暖白，用于面板层级和正文
- 错误色：单独定义，不与主色混用

### 字体

- 明确标题字体和正文字体
- 明确中文环境下的回退策略
- 不再依赖本机是否安装 `IBM Plex Sans` 或 `Georgia`

### 圆角与阴影

- 建立统一层级，不允许组件随意定义不同风格的圆角和阴影
- 卡片、抽屉、按钮、输入框分别对应固定语义

### 断点

建议至少采用以下思路：

- `mobile`: 默认样式
- `md`: 平板和中屏
- `lg`: 桌面
- `xl`: 大屏工作台

关键原则是移动优先，而不是继续从桌面往下压缩。

## 当前实施状态

更新日期：2026-03-28

当前已经完成第二轮重构落地，状态不是“计划已全部完成”，而是“Tailwind 与基础 primitives 已接管主工作台，后续重点转向清理、真实走查和回归验证”。

当前已落地内容：

- 已接入 Tailwind v4：`frontend/vite.config.ts` 已集成 `@tailwindcss/vite`，新增 `frontend/tailwind.config.ts`
- 已将 `frontend/src/styles.css` 收缩为 Tailwind 入口 + 字体、全局 token、滚动条、`focus-visible`、`prefers-reduced-motion`、Markdown 和 streaming 光标等少量全局规则
- 已新增并落地基础 UI primitives：`Button`、`IconButton`、`Input`、`Textarea`、`Panel`、`Drawer`、`StatusPill`、`Icon`、`MarkdownRenderer`、`Skeleton`、`StreamingCursor`、`ScrollAnchor`、`cn`
- 已完成主工作台骨架迁移：`WorkspacePage`、`NavigationRail`、`ChatShell`、`SessionPanel`、`WorkspaceDrawer` 已改为 Tailwind + primitives 组合
- 已完成聊天主区重构：消息自动滚动、"回到底部"按钮、Markdown 渲染、Streaming 光标与 skeleton、Timeline 可折叠、Composer 高度收紧与色调调整
- 已完成 SessionPanel 重构：时间分组、搜索、活跃态强化、加载 skeleton、抽屉式移动端入口
- 已完成 WorkspaceDrawer 重构：移除无功能 footer 假按钮、补充会话 ID 复制、未接入逻辑的配置项显式禁用并标记为“规划中”、实时日志区重排
- 已完成主界面核心交互文案的中文统一和标题/正文字体策略落地
- 已补充首版 Playwright e2e 回归，用例已迁移到新 UI 结构并验证通过
- 已补充 `focus-visible`、`prefers-reduced-motion`、图标按钮 `aria-label`、blur 降级和部分过渡动画
- 前端 `typecheck` 与 `build` 已通过

当前仍未完成的关键项：

- `SectionCard` 等计划内 primitives 仍未独立沉淀，部分通用表达仍可继续抽离
- 移动端骨架虽然已明显优于旧版，但仍需真实设备走查，确认抽屉、键盘弹起、窄屏滚动和触达关系
- 旧样式、旧类名和废弃组件尚未完成系统清理，但 `session-sidebar.tsx` 已完成移除
- 尚未完成桌面端与移动端的真实视觉走查
- 当前生产构建存在 bundle 体积告警，尚未进行拆包和性能收口

## 分阶段开发计划

### Phase 0：准备阶段

当前状态：

- 已完成。Tailwind v4、`frontend/tailwind.config.ts` 和 `@tailwindcss/vite` 已接入
- 已完成“文案主语言与字体策略”准备，当前样式层已显式补充字体导入、中文文案方向和全局 token

目标：

- 安装 Tailwind 及必要构建配置
- 建立 `tailwind.config` 与基础 token
- 梳理需要保留的全局样式
- 明确文案主语言和字体策略

产出：

- Tailwind 基础配置可运行
- 新的样式入口文件建立完成
- 一版文案统一原则

验收：

- 前端可以正常编译
- Tailwind utility 在页面中生效
- 未引入明显的样式双轨冲突

### Phase 1：基础 UI primitives

当前状态：

- 大部分完成。已新增 `Button`、`IconButton`、`Input`、`Textarea`、`Panel`、`Drawer`、`StatusPill`、`Icon`、`MarkdownRenderer`、`Skeleton`、`StreamingCursor`、`ScrollAnchor`、`cn`
- 已完成主工作台组件迁移，业务组件不再继续依赖 `primary-button`、`ghost-button`、`text-input` 等旧类名体系
- 未完成项主要是：`SectionCard` 等仍未独立沉淀，部分通用交互仍然散落在业务组件内部

目标：

- 抽取按钮、输入框、面板、状态标签、图标按钮等基础组件
- 让重复样式从业务组件中抽离
- 统一图标管理：抽取 `Icon` 组件或引入 `lucide-react`，替代所有内联 SVG
- 建立 `Skeleton` 组件，为后续各阶段的 loading 状态提供统一 placeholder

产出：

- 一组可复用的基础 UI 组件
- 常用视觉变体和状态语义
- 统一的图标体系，所有组件不再包含内联 SVG

验收：

- `primary-button`、`ghost-button`、`text-input` 等旧样式可以被新 primitives 覆盖
- 业务组件可以开始迁移而不继续依赖旧 CSS 类
- 所有图标通过统一组件渲染，尺寸和 strokeWidth 一致

### Phase 2：布局骨架重构

当前状态：

- 大部分完成。`WorkspacePage`、`NavigationRail`、`ChatShell`、`SessionPanel`、`WorkspaceDrawer` 的主骨架已按 Tailwind + primitives 体系重建
- Timeline 折叠、Composer 高度与色调、移动端 rail 横向化和抽屉分层均已落地
- 未完成项主要是：移动端真实设备适配和信息层级仍需视觉走查验证，尚未做最终性能收口

目标：

- 重构 `WorkspacePage`
- 重构桌面端和移动端导航策略
- 调整 SessionPanel 与 WorkspaceDrawer 的入口和层级关系
- Timeline rail 改为可折叠结构，默认收起，有事件时展开或 badge 提示
- Composer 区域高度策略调整：默认收紧，聚焦时展开，按内容自适应
- Composer 色调过渡：调整深色背景或增加渐变缓冲，减少与浅色主体的割裂

产出：

- 桌面端骨架稳定
- 移动端首屏信息优先级正确
- Timeline 不再在无事件时浪费固定列宽
- Composer 不再过度挤压消息阅读区

验收：

- 移动端首屏不再被导航 rail 占据
- 抽屉与历史面板在不同尺寸下显示合理
- 页面不存在横向滚动
- 在 1080-1280px 笔记本屏幕上，消息区获得足够的阅读空间
- Composer 与主体之间的色调过渡自然

### Phase 3：ChatShell 与空状态重构

当前状态：

- 大部分完成。消息自动滚动、Markdown 渲染、Streaming 光标与 skeleton、空状态和按钮层级首轮重构均已落地，`ScrollAnchor` 已独立沉淀
- 未完成项主要是：部分动效和视觉细节仍可继续收口

目标：

- 重构聊天头部、时间线区、消息区和 composer
- 单独设计空状态
- 重做按钮层级和禁用态
- 实现消息列表自动滚动到底部，新消息和 streaming delta 更新时自动跟随，用户手动上滚时暂停跟随并显示"回到底部"浮动按钮
- 引入 Markdown 渲染：使用 `react-markdown` 等库渲染 assistant 回复，支持代码块高亮、列表、加粗、链接，并建立统一的 markdown 排版样式
- 为 streaming 消息添加打字机效果：尾部闪烁光标动画，"Waiting for delta..." 状态使用 skeleton placeholder 替代纯文本

产出：

- 聊天主区域成为新的视觉核心
- 空状态具有明确引导能力
- 消息内容具备富文本可读性
- Streaming 过程有清晰的视觉反馈

验收：

- 无消息时页面仍具备清晰的下一步动作
- 发送、停止、等待中的状态表达明确
- 新消息到来时列表自动滚动到底部
- Assistant 回复中的代码块、列表等 markdown 内容正确渲染
- Streaming 过程中用户能明确感知"正在生成"

### Phase 4：抽屉与表单重构

当前状态：

- 大部分完成。Session 时间分组、搜索、活跃态强化、抽屉假按钮移除、复制会话 ID、实时日志区域优化和抽屉布局重排已完成
- 未完成项主要是：抽屉表单尚未接入真实配置保存逻辑；移动端表单布局和底部操作层级仍可继续优化

目标：

- 重构设置抽屉内部信息架构
- 为移动端和桌面端分别调整表单布局
- 规范折叠卡片、日志区和底部操作区
- 修复抽屉 footer：移除无功能的 "Reset to Default" 和 "Save Changes" 假按钮，或接上真实逻辑；不允许界面上存在无响应的可点击元素
- Session 列表引入时间分组（今天/昨天/更早）和更明显的活跃状态标记
- 考虑为 Session 列表加入搜索或过滤能力

产出：

- 可读、可操作、可扩展的抽屉结构
- 所有按钮均有明确功能或已被移除
- Session 列表具备清晰的信息层次

验收：

- 移动端输入框与操作按钮不再拥挤
- 抽屉内容区和 footer 的层级明确
- Live Logs 在有无内容两种状态下都自然
- 抽屉中不存在点击无响应的按钮
- Session 列表有时间分组，活跃 session 视觉突出

### Phase 5：语言与文案统一

当前状态：

- 基本完成。主界面核心交互文案已基本统一为中文
- 未完成项主要是：仍需做一次全量文案走查，确认不存在边缘状态或次级提示的中英文残留

目标：

- 页面所有文案统一为当前主语言
- 统一按钮、状态标签、空状态、抽屉标题、辅助提示

产出：

- 一套统一文案

验收：

- 主界面不再出现中英混杂的核心交互文案

### Phase 6：可访问性与动效收口

当前状态：

- 部分完成。`focus-visible`、`prefers-reduced-motion`、图标按钮可访问文本、消息与 session 列表 skeleton、背景 blur 降级已补齐
- 未完成项主要是：面板切换与状态变化的动效收口仍不完整，表单控件语义和低端设备降级策略仍需进一步验证

目标：

- 补齐焦点态
- 支持 reduced motion
- 补充图标按钮的可访问文本
- 优化表单控件语义
- 为消息列表和 session 列表补齐 loading skeleton placeholder
- 为面板切换、抽屉开关、状态变化补齐 fade/slide 过渡动画
- 背景双层 blur（`filter: blur(40px)` + `backdrop-filter: blur(24px)`）在 `prefers-reduced-motion` 下降级或移除，考虑低端设备降级为纯色背景

产出：

- 交互收口
- 可访问性基础达标
- 状态切换不再生硬跳变
- 低端设备渲染性能得到保障

验收：

- 键盘导航时焦点清晰可见
- 动画可以降级
- 图标按钮不再只依赖 `title`
- 页面加载和 session 切换时有 skeleton 过渡
- 在 `prefers-reduced-motion: reduce` 下 blur 和动画均已降级

### Phase 7：清理与验证

当前状态：

- 部分完成。`styles.css` 已显著缩减为全局入口样式，主工作台旧类名体系已基本退出主链路，`session-sidebar.tsx` 已删除，首版 Playwright e2e 已补齐并跑通
- 未完成项主要是：遗留旧样式彻底删除、桌面端/移动端真实走查与最终性能/回归验证

目标：

- 删除未使用组件和旧样式
- 补齐必要的布局和交互验证
- 完成最终样式收口

产出：

- 精简后的前端结构

验收：

- `session-sidebar.tsx` 等废弃结构完成处理
- `styles.css` 仅保留必要全局样式
- 桌面端和移动端走查通过

## 文件级改造建议

### 必改文件

- `frontend/src/pages/workspace-page.tsx`
- `frontend/src/components/navigation-rail.tsx`
- `frontend/src/components/chat-shell.tsx`
- `frontend/src/components/session-panel.tsx`
- `frontend/src/components/workspace-drawer.tsx`
- `frontend/src/main.tsx`
- `frontend/src/styles.css`
- `frontend/package.json`
- `frontend/vite.config.ts`

### 建议新增

- `frontend/tailwind.config.ts`
- `frontend/src/components/ui/*`（Button、IconButton、Icon、Input、Textarea、Panel、Drawer、StatusPill、SectionCard、Skeleton、StreamingCursor）
- `frontend/src/components/ui/markdown-renderer.tsx`（封装 `react-markdown` + 代码高亮）
- `frontend/src/components/ui/scroll-anchor.tsx`（消息列表自动滚动 + "回到底部"浮动按钮）
- `frontend/src/lib/cn.ts`

### 建议清理

- `frontend/src/components/session-sidebar.tsx`
- 旧的按钮、输入框、状态胶囊类名体系
- 已被 Tailwind primitives 替代的全局组件样式
- 所有组件中的内联 SVG（被统一 Icon 组件替代后）
- 抽屉 footer 中无功能的假按钮（如未接入逻辑则直接移除）

## 开发顺序建议

当前建议的下一步顺序如下：

1. 清理剩余旧类名和未使用样式
2. 抽离 `SectionCard` 等仍未沉淀的通用能力
3. 做桌面端与移动端真实视觉走查，修正细节问题
4. 扩展 e2e 覆盖范围并补充视觉回归基线
5. 处理构建体积告警和必要的性能收口

原因：

- Tailwind 接管、基础 primitives 和主骨架迁移已经完成，不再需要重复做基础设施建设
- 当前最大的风险不再是“怎么重构”，而是“如何收尾并验证没有回归”
- 仍有少量通用展示能力尚未抽离，继续散落在业务组件里会增加后续维护成本
- 视觉走查和 e2e 验证是当前进入稳定阶段前的关键缺口
- bundle 告警已经出现，说明后续需要开始关注构建体积和加载成本

## 验收标准

本计划完成后，至少应满足以下标准：

### 结构

- 桌面端工作台结构稳定
- 移动端不再是桌面布局压缩版
- 抽屉、面板、消息区和输入区层级清晰
- Timeline rail 可折叠，无事件时不占据固定列宽
- Composer 高度按内容自适应，不再固定挤压消息区

### 视觉

- 文案语言统一
- 字体表现稳定
- 空状态和禁用态具备明确语义
- 颜色、阴影、圆角、边框风格统一
- Composer 与主体之间色调过渡自然
- Session 列表有时间分组和活跃状态视觉区分
- 页面加载和状态切换有 skeleton 过渡，不再生硬跳变
- 界面上不存在点击无响应的按钮

### 聊天体验

- 新消息到来时列表自动滚动到底部，用户手动上滚时暂停跟随
- Assistant 回复中的 Markdown 内容（代码块、列表、加粗、链接等）正确渲染
- Streaming 过程有闪烁光标或 pulse 动画，用户能明确感知"正在生成"

### 技术

- 样式主体系迁移至 Tailwind
- 全局 CSS 显著缩减
- 无明显重复样式源
- 未使用组件和样式得到清理
- 所有图标通过统一 Icon 组件渲染，无内联 SVG 散落

### 质量

- 桌面端和移动端均完成真实视觉复查
- 焦点态、动效降级、图标按钮语义达标
- 核心聊天链路未受回归影响
- 在 `prefers-reduced-motion: reduce` 下 blur 和动画均已降级
- 低端设备上无明显渲染掉帧

## 备注

- `docs/frontend-visual-audit.md` 继续保留，作为本计划的审计依据
- 本文档从现在起作为前端重构开发的唯一主计划文档
- 下一步开发应以本文件的阶段划分和验收标准为准
- 本次更新新增了问题 8-17（消息自动滚动、Markdown 渲染、Streaming 视觉反馈、Composer 优化、Timeline 可折叠、图标统一、假按钮修复、Session 列表层次、Loading skeleton、Blur 性能降级），均已整合进对应的重构目标、Phase 和验收标准中

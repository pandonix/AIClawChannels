# 前端视觉走查与优化建议

## 背景

本次走查针对当前 `frontend/` 工作台界面进行完整视觉审计，覆盖：

- 前端页面结构与组件组织
- 全局样式、响应式断点与视觉系统
- 本地启动后的真实浏览器检视
- 桌面端与移动端的实际布局、滚动、抽屉和表单状态

本次结论以“当前实现是否具备产品级视觉一致性和可用性”为标准，而不是只看功能是否可用。

## 走查方式

### 代码走查

重点审阅了以下文件：

- `frontend/src/styles.css`
- `frontend/src/components/chat-shell.tsx`
- `frontend/src/components/navigation-rail.tsx`
- `frontend/src/components/session-panel.tsx`
- `frontend/src/components/workspace-drawer.tsx`
- `frontend/src/pages/workspace-page.tsx`

### 真实视觉检视

本地启动了前后端服务，并通过浏览器完成了真实页面检查，覆盖：

- 桌面端主界面
- Session 历史面板
- 右侧设置抽屉
- 移动端首屏
- 移动端历史面板
- 移动端设置抽屉

## 总体判断

当前界面已经具备明确的工作台结构和基础品牌方向，整体配色与玻璃态面板并不差，桌面端也已经有一定气质。

但问题不在“风格缺失”，而在以下三个层面：

1. 响应式策略不完整，桌面结构被直接压缩到移动端
2. 文案语言与交互表达不统一，成品感不足
3. 空状态、禁用态、表单排版等细节没有达到产品级完成度

结论是：当前 UI 可以继续开发功能，但如果进入外部展示或更高频使用阶段，建议优先做一轮视觉和响应式修复。

## 问题清单

### 1. 严重：移动端导航 rail 直接占据首屏，破坏信息优先级

现状：

- 移动端仍保留桌面版 `navigation rail`
- 导航在窄屏下改为横向区域，但仍占据较高垂直空间
- 主内容区和输入区被整体向下挤压，首屏有效内容面积明显不足

影响：

- 首屏首先看到的是 3 个图标，而不是当前会话和消息内容
- 用户进入页面后，主要工作流被次级导航压到折叠线下方
- 在移动端看起来更像“桌面界面缩小版”，不是专门设计过的移动工作台

定位：

- `frontend/src/styles.css`
  - `.navigation-rail`
  - `@media (max-width: 820px)`
- `frontend/src/components/navigation-rail.tsx`

建议：

- 移动端不要继续使用桌面 rail 结构
- 改为顶部工具条、底部操作栏，或合并为单个更多菜单入口
- 将“历史”“设置”收敛为二级入口，把当前会话标题和输入区放回首屏核心区域

### 2. 严重：设置抽屉在移动端只做了宽度拉伸，没有完成表单重排

现状：

- 移动端设置抽屉宽度变成 `100vw`
- 但内部 `.config-value` 仍然保持横向排布
- 标题输入框和 `Save` 按钮被硬压在一行
- 底部 footer 固定存在，进一步压缩正文可视高度

影响：

- 表单阅读节奏被打断，字段像是“桌面表单硬塞到手机里”
- 短按钮贴在输入框右侧，显得局促，且不利于误触控制
- 设置抽屉在小屏上更像配置面板截图，不像可操作的移动设置页

定位：

- `frontend/src/styles.css`
  - `.config-value`
  - `.drawer-footer`
  - `@media (max-width: 820px) .workspace-drawer`
- `frontend/src/components/workspace-drawer.tsx`

建议：

- 在移动端让 `.config-value` 纵向堆叠
- `Save`、`Copy` 等操作改为块级或独立行
- 将 footer 改为更轻的 sticky 操作区，或仅在有修改时显示主操作
- 对抽屉内容做更明确的分组和折叠优先级

### 3. 高：界面语言混杂，中英切换频繁

现状：

- 页面同时使用中文和英文
- 例如：`Workspace`、`Timeline`、`Send`、`Stop`、`Session Settings`
- 同时会话标题、时间格式、默认会话名又使用中文

影响：

- 产品语言系统不统一
- 视觉上会让页面显得像内部 demo，而不是对外完成品
- 降低品牌感与信任感

定位：

- `frontend/src/components/chat-shell.tsx`
- `frontend/src/components/session-panel.tsx`
- `frontend/src/components/workspace-drawer.tsx`

建议：

- 明确当前产品主语言
- 如果面向中文用户，优先统一为中文
- 将按钮、空状态、抽屉标题、状态标签、事件说明全部收敛到同一语言体系
- 后续如需国际化，再通过文案资源表统一管理

### 4. 高：空状态层级过弱，大面积留白没有承担引导作用

现状：

- 空会话状态下，主工作区仍保留大尺寸消息区和时间线栏
- 但实际只有一行弱提示文本
- 输入区虽存在，但与主内容之间缺少清晰引导关系

影响：

- 用户第一眼无法快速判断应该做什么
- 中央大块留白显得界面“没做完”
- 空状态未承担 onboarding 作用

定位：

- `frontend/src/styles.css`
  - `.message-stage`
  - `.empty-state`
- `frontend/src/components/chat-shell.tsx`

建议：

- 为无消息状态设计专门的 empty state 布局
- 将“开始对话”的提示前置到主视觉中心
- 可以增加建议动作、示例提问或最近操作入口
- 空状态下弱化 timeline 区，避免其在无内容时占据固定空间

### 5. 中：按钮禁用态和操作优先级表达不足

现状：

- 主按钮和次按钮禁用态统一通过 `opacity: 0.45` 处理
- 在深色 composer 背景上，次按钮尤其容易退成低可见度噪音
- 移动端仅把发送按钮拉成满宽，`Stop` 仍是独立小胶囊

影响：

- 禁用与次级操作的区分不清晰
- 用户对当前可执行动作的判断成本变高
- 移动端操作排布略显失衡

定位：

- `frontend/src/styles.css`
  - `.primary-button`
  - `.ghost-button`
  - `.composer-shell__actions`
- `frontend/src/components/chat-shell.tsx`

建议：

- 区分“禁用态”和“次级态”，不要只依赖整体透明度
- 在移动端为操作区建立稳定层级
- 可考虑让运行中主动作变为“停止生成”，而不是并列放置两个风格差距有限的按钮

### 6. 中：字体系统不稳定，实际显示效果依赖本机环境

现状：

- 全局声明了 `"IBM Plex Sans"`，但项目里没有看到对应字体加载
- 标题使用 `Georgia`
- 最终显示结果取决于本机是否安装这些字体

影响：

- 不同环境下字重、字宽、行高可能明显不同
- 标题和正文的气质可能偏移
- 很难稳定复现设计效果

定位：

- `frontend/src/styles.css`
- `frontend/index.html`

建议：

- 显式引入项目使用的 Web 字体，或改用已知可控的系统字体栈
- 定义清晰的标题/正文字体策略，而不是依赖环境回退
- 同时验证中文字体与英文字体搭配效果

### 7. 中：可达性和交互细节还不完整

现状：

- 未看到显式的 `:focus-visible` 视觉规则
- 未看到 `prefers-reduced-motion` 处理
- 图标按钮主要依赖 `title` 提示
- 自定义开关使用 `display: none` 隐藏原生 checkbox

影响：

- 键盘用户和辅助技术用户的交互反馈不足
- 动画在低敏感用户场景下不可降级
- 表单类控件的语义和可操作性存在风险

定位：

- `frontend/src/styles.css`
- `frontend/src/components/navigation-rail.tsx`
- `frontend/src/components/chat-shell.tsx`
- `frontend/src/components/workspace-drawer.tsx`

建议：

- 补充统一的 `:focus-visible` 样式
- 为抽屉和面板动效增加 reduced motion 分支
- 图标按钮补齐明确的可访问名称
- 避免将原生表单控件彻底 `display: none`

## 优化优先级建议

### P0：优先立即处理

- 重做移动端导航结构
- 重排移动端设置抽屉表单
- 统一当前界面的主语言

### P1：应在下一轮 UI 修复中处理

- 设计专门的空状态布局
- 调整 composer 操作区层级和禁用态表达
- 规范字体加载和字体栈

### P2：作为质量收口项处理

- 补齐 `focus-visible`
- 加入 `prefers-reduced-motion`
- 提升图标按钮和开关的可访问性实现

## 推荐修复顺序

建议按以下顺序推进：

1. 先改移动端布局骨架
2. 再统一文案语言和信息层级
3. 然后修空状态、按钮态、抽屉细节
4. 最后补可访问性与动效降级

原因：

- 当前最影响实际使用的是响应式结构，而不是装饰细节
- 语言统一和层级优化会直接提升“完成度感”
- 可访问性和动效收口应该在结构稳定后统一补齐

## 建议的下一步产出

如果继续推进，建议下一步直接产出一版前端修复方案，至少包含：

- 移动端导航与抽屉的重构草案
- 统一后的中英文文案表
- 空状态和 composer 区域的新布局
- 一组新的响应式样式规则

也可以直接进入实现阶段，先完成一轮可见的 UI 修复，再做第二轮精细打磨。

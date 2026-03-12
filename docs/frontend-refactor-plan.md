# 前端 UI 布局重构方案

## 一、重构目标

将现有的两栏式布局（Sidebar + Chat）改造为三段式抽屉布局：
- **Navigation Rail (56px)**: 极简功能导航栏
- **Chat Stage (自适应)**: 核心对话区域
- **Drawer (420px overlay)**: 配置抽屉（覆盖模式）

## 二、已完成的核心改动

### 1. 新增组件

#### NavigationRail (`src/components/navigation-rail.tsx`)
- **宽度**: 56px
- **功能按钮**:
  - `+` (New Chat): 打开 Session 面板
  - `🕒` (History): 切换 Session 列表面板
  - `⚙️` (Settings): 打开配置抽屉
- **样式**: 深色背景，垂直布局，极简图标

#### SessionPanel (`src/components/session-panel.tsx`)
- **宽度**: 340px (响应式: 移动端 85vw)
- **触发方式**: 从 NavigationRail 点击 History 按钮
- **显示模式**: 从左侧滑出，覆盖在 Chat Stage 之上
- **功能保留**:
  - Session 列表展示
  - 新建 Session
  - 刷新列表
  - Session 切换

#### WorkspaceDrawer (`src/components/workspace-drawer.tsx`)
- **宽度**: 420px (响应式: 移动端全屏)
- **触发方式**: 点击 ChatShell 右上角 ⚙️ 图标
- **显示模式**: 从右侧滑出，覆盖在 Chat Stage 之上
- **核心模块**:
  1. **固定头部**:
     - Session 状态摘要 (Connected/Disconnected)
     - Pin 图标（预留固定功能）
     - 关闭按钮
  2. **滚动配置区**:
     - **基础信息卡片**: Session ID (只读+复制)、Session Title (可编辑)、Agent ID
     - **Git Operations 卡片** (可折叠): Repository, Branch, Tag Pattern
     - **Context Constraints 卡片** (可折叠): File Path, Ignore Patterns
     - **Advanced/Debug 卡片** (可折叠): WebSocket Gateway, Mock Mode 开关
  3. **Live Logs 模块** (可折叠):
     - 实时显示 SSE 事件流
     - 显示 Agent Events 数量徽章
     - 事件列表：stage, message, timestamp

### 2. 修改的组件

#### ChatShell (`src/components/chat-shell.tsx`)
**移除**:
- Title Editor (重命名功能移至 Drawer)
- Summary Cards (Session ID, Agent, Latest preview)

**简化**:
- Header 只保留: Session 标题 + 状态指示器 + 设置图标
- Composer 简化为: 输入框 + Stop/Send 按钮

**新增**:
- 右上角 ⚙️ 设置图标按钮
- 点击触发 `onOpenSettings` 回调

#### WorkspacePage (`src/pages/workspace-page.tsx`)
**新增状态**:
- `historyPanelOpen`: 控制 SessionPanel 显示
- `drawerOpen`: 控制 WorkspaceDrawer 显示

**布局调整**:
- 从两栏改为三段式: NavigationRail + ChatShell
- SessionPanel 和 WorkspaceDrawer 作为独立浮层

**Props 传递**:
- NavigationRail: 传递面板切换回调
- SessionPanel: 传递 session 管理相关 props
- WorkspaceDrawer: 传递 session 配置和 streamState

### 3. CSS 样式更新 (`src/styles.css`)

#### 布局调整
```css
.workspace-grid {
  grid-template-columns: 56px minmax(0, 1fr); /* 从 280-340px + 1fr 改为 56px + 1fr */
}
```

#### 新增样式类
- `.navigation-rail`: 导航栏样式
- `.rail-button`: 导航按钮样式
- `.rail-button--active`: 激活状态
- `.drawer-overlay`: 半透明遮罩
- `.session-panel`: Session 面板样式
- `.workspace-drawer`: 配置抽屉样式
- `.drawer-header`, `.drawer-body`, `.drawer-footer`: 抽屉内部结构
- `.config-card`: 配置卡片样式
- `.config-card--collapsible`: 可折叠卡片
- `.config-field`, `.config-label`, `.config-value`: 配置项样式
- `.config-switch`: 开关控件样式
- `.live-logs`: 日志模块样式
- `.log-entry`: 日志条目样式
- `.icon-button`: 图标按钮样式
- `.chevron`: 折叠箭头样式

#### 动画效果
```css
@keyframes fadeIn { /* 遮罩淡入 */ }
@keyframes slideInRight { /* 从右侧滑入 */ }
@keyframes slideInLeft { /* 从左侧滑入 */ }
```

#### 响应式调整
- **1080px 以下**: Drawer 宽度缩小至 360px，SessionPanel 缩小至 300px
- **820px 以下**: Drawer 全屏显示，SessionPanel 85vw
- **560px 以下**: 进一步优化移动端显示

## 三、交互流程

### 1. 打开 Session 列表
1. 用户点击 NavigationRail 的 `🕒` 按钮
2. `historyPanelOpen` 状态切换为 `true`
3. SessionPanel 从左侧滑出，显示半透明遮罩
4. 点击遮罩或关闭按钮，面板收回

### 2. 打开配置抽屉
1. 用户点击 ChatShell 右上角 `⚙️` 图标
2. `drawerOpen` 状态设置为 `true`
3. WorkspaceDrawer 从右侧滑出，显示半透明遮罩
4. 点击遮罩或关闭按钮，抽屉收回

### 3. 配置 Session
1. 在 Drawer 中修改 Session Title
2. 点击 Save 按钮或按 Enter 键
3. 调用 `handleRenameSession` 更新 Session
4. 成功后自动同步到 Session 列表

### 4. 查看实时日志
1. 在 Drawer 底部点击 "Live Logs" 展开
2. 实时显示 `streamState.agentEvents`
3. 显示事件数量徽章
4. 每条日志包含: stage, message, timestamp

## 四、技术细节

### 1. 状态管理
- 使用 React `useState` 管理面板显示状态
- 通过 props 传递回调函数控制面板开关
- 保持原有的 React Query 数据管理逻辑

### 2. 样式实现
- 使用 CSS Grid 实现三段式布局
- 使用 `position: fixed` 实现浮层效果
- 使用 CSS 动画实现滑入/滑出效果
- 使用 `backdrop-filter` 实现毛玻璃遮罩

### 3. 响应式设计
- 大屏 (>1080px): 完整显示所有功能
- 中屏 (820-1080px): 缩小 Drawer 和 Panel 宽度
- 小屏 (<820px): Drawer 全屏，Panel 85vw

### 4. 可访问性
- 所有按钮添加 `title` 属性
- 使用语义化 HTML 标签
- 支持键盘操作 (Enter 提交)

## 五、后续优化建议

### 1. 功能增强
- [ ] 实现 Drawer 的 Pin 功能（固定抽屉，Chat 区域自动平移）
- [ ] 添加配置项的实时保存（失焦自动保存）
- [ ] 实现 Git 配置的分支自动补全
- [ ] 添加配置项的验证和错误提示
- [ ] 实现 Live Logs 的过滤和搜索功能

### 2. 性能优化
- [ ] 使用 `React.memo` 优化组件渲染
- [ ] 使用虚拟滚动优化长列表（Session 列表、日志列表）
- [ ] 添加配置项的防抖处理

### 3. 用户体验
- [ ] 添加配置项的 Tooltip 说明
- [ ] 实现配置项的撤销/重做功能
- [ ] 添加配置模板（快速应用预设配置）
- [ ] 实现配置的导入/导出功能

### 4. 测试
- [ ] 添加组件单元测试
- [ ] 添加交互集成测试
- [ ] 添加响应式布局测试

## 六、开发验证

### 启动开发服务器
```bash
cd frontend
npm run dev
```

### 验证清单
- [x] TypeScript 类型检查通过
- [x] 开发服务器启动成功 (http://localhost:5175)
- [ ] NavigationRail 显示正常
- [ ] 点击 History 按钮，SessionPanel 从左侧滑出
- [ ] 点击 Settings 图标，WorkspaceDrawer 从右侧滑出
- [ ] ChatShell 头部简化，只显示标题和状态
- [ ] Drawer 中的配置项可以正常编辑
- [ ] Live Logs 可以展开/折叠，显示实时事件
- [ ] 响应式布局在不同屏幕尺寸下正常工作

## 七、文件清单

### 新增文件
- `src/components/navigation-rail.tsx` (52 行)
- `src/components/session-panel.tsx` (118 行)
- `src/components/workspace-drawer.tsx` (332 行)

### 修改文件
- `src/pages/workspace-page.tsx` (完全重写，369 行)
- `src/components/chat-shell.tsx` (简化，178 行)
- `src/styles.css` (新增约 400 行样式)

### 保留文件（未使用）
- `src/components/session-sidebar.tsx` (可以删除，已被 SessionPanel 替代)

## 八、总结

本次重构成功将前端布局从两栏式改造为三段式抽屉布局，实现了以下目标：

1. **极致简洁**: NavigationRail 只有 56px，最大化聊天区域
2. **低成本切换**: 抽屉式设计允许用户在"观察 AI 输出"与"调整系统参数"之间快速切换
3. **复杂配置支持**: Drawer 内部采用模块化设计，支持未来扩展
4. **实时调试**: Live Logs 模块方便技术开发者监控 WebSocket 协议
5. **响应式友好**: 在不同屏幕尺寸下都能良好工作

所有代码已通过 TypeScript 类型检查，开发服务器已成功启动，可以进行功能验证。

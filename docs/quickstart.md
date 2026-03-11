# Quickstart

## 前置条件

- Node.js 20+
- npm 10+

## 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd AIClawChannels
npm install
```

## 2. 配置环境变量

```bash
cp .env.example .env
```

后端启动时会自动加载项目根目录下的 `.env` 文件。默认配置无需修改，直接使用 mock runtime 启动。

## 3. 启动开发服务

打开两个终端分别运行：

```bash
# 终端 1 — 后端
npm run dev:backend

# 终端 2 — 前端
npm run dev:frontend
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 | http://localhost:3001 |

打开浏览器访问 http://localhost:5173，即可看到聊天界面。

默认以 `MOCK_GATEWAY=true` 运行，后端使用内置 mock runtime，无需连接真实 Gateway。

## 4. 连接真实 Gateway（可选）

如果你有本地运行的 OpenClaw Gateway，修改 `.env`：

```env
MOCK_GATEWAY=false
GATEWAY_WS_URL=ws://127.0.0.1:18789
GATEWAY_OPERATOR_TOKEN=your_token
```

或直接通过环境变量覆盖：

```bash
MOCK_GATEWAY=false \
GATEWAY_OPERATOR_TOKEN=your_token \
npm run dev:backend
```

如果 Gateway 开启了 TLS，还需设置：

```env
GATEWAY_WS_URL=wss://your-gateway-host
GATEWAY_TLS_FINGERPRINT=sha256/...
```

## 5. 运行 E2E 测试

```bash
npm run test:e2e
```

Playwright 会自动启动前后端服务并执行 10 个测试场景。

---

## 项目结构速览

```
backend/src/
  app.ts              # 入口，runtime 装配
  routes/             # HTTP/SSE 路由
  chat/               # 聊天服务
  sessions/           # 会话服务
  gateway/            # Gateway WS 客户端
  runtime/            # BackendRuntime 接口与实现
  event-bus/          # SSE 事件分发

frontend/src/
  pages/              # 页面（WorkspacePage）
  components/         # ChatShell、SessionSidebar
  hooks/              # useChatStream（SSE 状态管理）
  api/                # HTTP 客户端

packages/contracts/   # 前后端共享类型定义
```

## 核心 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/sessions` | 获取会话列表 |
| POST | `/api/sessions` | 创建会话 |
| PATCH | `/api/sessions/:id` | 重命名会话 |
| GET | `/api/chat/history?sessionId=` | 获取聊天历史 |
| POST | `/api/chat/send` | 发送消息 |
| POST | `/api/chat/abort` | 停止当前 run |
| GET | `/api/chat/stream?sessionId=` | SSE 流式事件 |

完整 API 契约见 [docs/api-contract.md](api-contract.md)。

## 常见问题

**后端启动报端口占用**

```bash
lsof -ti:3001 | xargs kill
```

**连接真实 Gateway 失败**

检查 `GATEWAY_WS_URL` 是否可达，以及 `GATEWAY_OPERATOR_TOKEN` 是否正确。后端日志会打印连接状态。

**E2E 测试失败**

确保 3001 和 5173 端口未被占用，然后重新运行 `npm run test:e2e`。

# AIClawChannels

基于 OpenClaw Gateway 构建的自定义 Web Channels 项目。

当前阶段以方案设计为主，目标是实现一个前后端分离的聊天系统：

- 前端页面只通过 HTTP/SSE 与自有后端交互
- 自有后端作为代理层，通过 WebSocket 与 OpenClaw Gateway 通讯
- OpenClaw Gateway 保持现有协议和运行方式不变

## 项目目标

构建一个属于自己的 Web 页面，作为自定义 channels 入口，与 OpenClaw 进行聊天式交互，并为后续扩展登录、权限、审计和公网部署保留空间。

## 当前状态

当前仓库已完成：

- 项目方向确认
- 系统架构设计
- 前后端职责拆分
- Gateway 对接方案设计
- 会话、事件流和 API 设计

当前仓库尚未开始：

- 前端工程初始化
- 后端工程初始化
- Gateway WS 代理实现
- UI 页面实现

## 架构概览

```text
Frontend Web UI <-> Custom Backend (HTTP/SSE) <-> OpenClaw Gateway (WS)
```

说明：

- 前端不直接访问 Gateway
- 后端统一处理 Gateway 握手、认证、重连和事件分发
- 前端只消费自定义业务 API

## 文档

详细设计方案见：

- [docs/openclaw-web-channel-design.md](/Users/sunnyin/Documents/workspace/AIClawChannels/docs/openclaw-web-channel-design.md)

## 建议的后续开发顺序

1. 初始化 `backend/`，先跑通 Gateway WS 握手和 `chat.send`
2. 初始化 `frontend/`，实现基础聊天页面
3. 接入 SSE，完成流式回复
4. 增加会话管理和登录

## 计划中的目录结构

```text
.
├── docs/
├── frontend/
├── backend/
└── README.md
```

## OpenClaw 依赖背景

本项目设计基于本机已安装的 OpenClaw 文档和 Gateway 协议能力，包括：

- Gateway WebSocket 协议
- Control UI 的聊天方法
- Gateway 的远程访问模型
- 聊天相关 schema

## 下一步

下一步建议直接开始创建：

- `backend/` 的 Gateway WS client
- `frontend/` 的聊天界面骨架
- 前后端最小可用 API

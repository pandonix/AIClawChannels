import { test, expect } from "@playwright/test";
import {
  createSession,
  selectSession,
  sendMessage,
  waitForStreamingComplete,
  waitForSseOpen,
  waitForSseNotOpen,
  forceDisconnectSse
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".workspace-sidebar")).toBeVisible();
});

// ─── 场景 1：会话列表加载、创建、重命名 ───────────────────────────────────────

test("场景1: 页面加载后显示会话列表", async ({ page }) => {
  await expect(page.locator(".session-stack")).toBeVisible();
  await expect(page.locator(".session-stack .session-card").first()).toBeVisible();
});

test("场景1: 创建新会话后出现在列表中并自动选中", async ({ page }) => {
  const name = `创建测试-${Date.now()}`;
  await createSession(page, name);
  await expect(page.locator(".chat-shell h2")).toContainText(name);
});

test("场景1: 重命名会话后标题更新", async ({ page }) => {
  const name = `重命名测试-${Date.now()}`;
  await createSession(page, name);
  await selectSession(page, name);

  const newTitle = `已重命名-${Date.now()}`;
  await page.locator("#session-title").fill(newTitle);
  await page.getByRole("button", { name: "Save Title" }).click();

  await expect(page.locator(".chat-shell h2")).toContainText(newTitle, { timeout: 5_000 });
  await expect(page.locator(".session-stack").getByText(newTitle)).toBeVisible();
});

// ─── 场景 2：发送消息后历史与会话列表刷新 ────────────────────────────────────

test("场景2: 发送消息后用户消息出现在聊天区", async ({ page }) => {
  const name = `场景2a-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  const msg = `hello-${Date.now()}`;
  await sendMessage(page, msg);

  await expect(
    page.locator(".message-card--user").filter({ hasText: msg })
  ).toBeVisible({ timeout: 5_000 });
});

test("场景2: 流式完成后 assistant 消息落地，会话 preview 更新", async ({ page }) => {
  const name = `场景2b-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `preview-test-${Date.now()}`);
  await waitForStreamingComplete(page);

  await expect(page.locator(".message-card--assistant").last()).toBeVisible({ timeout: 10_000 });
  await expect(
    page.locator(".session-card.active .session-card__preview")
  ).not.toContainText("no messages yet", { timeout: 5_000 });
});

// ─── 场景 3：SSE 建立后收到完整流式事件序列 ──────────────────────────────────

test("场景3: 发送消息后依次出现 agent.event、message.delta、message.final", async ({ page }) => {
  const name = `场景3-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `stream-test-${Date.now()}`);

  // agent.event 出现在 Timeline 面板
  await expect(page.locator(".event-card").first()).toBeVisible({ timeout: 5_000 });

  // message.delta 期间出现 live 气泡
  await expect(page.locator(".message-card--live")).toBeVisible({ timeout: 5_000 });

  // message.final 后 live 气泡消失，历史消息出现
  await waitForStreamingComplete(page);
  await expect(page.locator(".message-card--live")).toHaveCount(0);
  await expect(page.locator(".message-card--assistant").last()).toBeVisible();
});

// ─── 场景 4：SSE 中途断开并重连，后续事件继续 ────────────────────────────────

test("场景4: SSE 断开后自动重连，连接状态恢复为 open", async ({ page }) => {
  const name = `场景4a-${Date.now()}`;
  const sessionId = await createSession(page, name);
  await waitForSseOpen(page);

  await forceDisconnectSse(sessionId);

  // 连接状态离开 open
  await waitForSseNotOpen(page);

  // 自动重连后恢复 open
  await waitForSseOpen(page);
});

test("场景4: SSE 断开重连后，后续发送的消息仍可收到流式事件", async ({ page }) => {
  const name = `场景4b-${Date.now()}`;
  const sessionId = await createSession(page, name);
  await waitForSseOpen(page);

  await forceDisconnectSse(sessionId);
  await waitForSseOpen(page);

  await sendMessage(page, `post-reconnect-${Date.now()}`);
  await expect(page.locator(".message-card--live")).toBeVisible({ timeout: 5_000 });
  await waitForStreamingComplete(page);
  await expect(page.locator(".message-card--assistant").last()).toBeVisible();
});

// ─── 场景 5：message.final 在断线窗口丢失，重连后补拉 history 兜底 ───────────

test("场景5: SSE 在 delta 阶段断开，重连后 history 补拉完成 run", async ({ page }) => {
  const name = `场景5-${Date.now()}`;
  const sessionId = await createSession(page, name);
  await waitForSseOpen(page);

  // 发送消息，在 delta 阶段（final 之前）断开 SSE
  await sendMessage(page, `final-loss-test-${Date.now()}`);
  await expect(page.locator(".message-card--live")).toBeVisible({ timeout: 5_000 });
  await forceDisconnectSse(sessionId);

  // 重连后 composer 应最终解锁（history 补拉兜底了 final）
  await waitForStreamingComplete(page);
  await expect(page.locator(".message-card--assistant").last()).toBeVisible({ timeout: 15_000 });
});

// ─── 场景 6：停止操作触发 run.aborted，前端结束 activeRun ─────────────────────

test("场景6: 点击 Stop 后出现 aborted notice，composer 解锁", async ({ page }) => {
  const name = `场景6-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `abort-test-${Date.now()}`);

  // 等待 run 开始（Stop 按钮可用）
  await expect(page.getByRole("button", { name: "Stop" })).toBeEnabled({ timeout: 5_000 });
  await page.getByRole("button", { name: "Stop" }).click();

  // aborted notice 出现
  await expect(page.locator(".message-card--notice")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".message-card--notice")).toContainText("aborted");

  // activeRun 已清除：Stop 变回 disabled，composer 可以输入
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled({ timeout: 5_000 });
  await expect(page.locator(".composer-shell__input")).toBeEnabled();
});

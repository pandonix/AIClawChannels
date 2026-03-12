import { test, expect } from "@playwright/test";
import {
  createSession,
  forceDisconnectSse,
  openHistory,
  selectSession,
  sendMessage,
  waitForSseNotOpen,
  waitForSseOpen,
  waitForStreamingComplete
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".nav-rail")).toBeVisible();
  await expect(page.locator(".chat-stage")).toBeVisible();
});

test("场景1: 页面加载后显示会话历史抽屉", async ({ page }) => {
  await openHistory(page);
  await expect(page.locator(".history-list")).toBeVisible();
  await expect(page.locator(".history-card").first()).toBeVisible();
});

test("场景1: 创建新会话后出现在主舞台并自动选中", async ({ page }) => {
  const name = `创建测试-${Date.now()}`;
  await createSession(page, name);
  await expect(page.locator(".chat-stage__intro h2")).toContainText(name);
});

test("场景1: 重命名会话后标题更新", async ({ page }) => {
  const name = `重命名测试-${Date.now()}`;
  await createSession(page, name);
  await selectSession(page, name);

  const newTitle = `已重命名-${Date.now()}`;
  await page.locator("#session-title").fill(newTitle);
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.locator(".chat-stage__intro h2")).toContainText(newTitle, { timeout: 5_000 });
  await openHistory(page);
  await expect(page.locator(".history-list").getByText(newTitle)).toBeVisible();
});

test("场景2: 发送消息后用户消息出现在聊天区", async ({ page }) => {
  const name = `场景2a-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  const msg = `hello-${Date.now()}`;
  await sendMessage(page, msg);

  await expect(
    page.locator(".message-bubble--user").filter({ hasText: msg })
  ).toBeVisible({ timeout: 5_000 });
});

test("场景2: 流式完成后 assistant 消息落地，会话 preview 更新", async ({ page }) => {
  const name = `场景2b-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `preview-test-${Date.now()}`);
  await waitForStreamingComplete(page);

  await expect(page.locator(".message-bubble--assistant").last()).toBeVisible({ timeout: 10_000 });
  await openHistory(page);
  await expect(
    page.locator(".history-card.history-card--active .history-card__preview")
  ).not.toContainText("No messages yet.", { timeout: 5_000 });
});

test("场景3: 发送消息后日志里出现 agent.event、message.delta、message.final", async ({ page }) => {
  const name = `场景3-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `stream-test-${Date.now()}`);

  await expect(page.locator(".live-log__row").filter({ hasText: "agent.event" }).first()).toBeVisible({
    timeout: 5_000
  });
  await expect(page.locator(".message-bubble--live")).toBeVisible({ timeout: 5_000 });
  await waitForStreamingComplete(page);
  await expect(page.locator(".message-bubble--live")).toHaveCount(0);
  await expect(page.locator(".live-log__row").filter({ hasText: "message.final" }).first()).toBeVisible({
    timeout: 5_000
  });
});

test("场景4: SSE 断开后自动重连，连接状态恢复为 open", async ({ page }) => {
  const name = `场景4a-${Date.now()}`;
  const sessionId = await createSession(page, name);
  await waitForSseOpen(page);

  await forceDisconnectSse(sessionId);
  await waitForSseNotOpen(page);
  await waitForSseOpen(page);
});

test("场景4: SSE 断开重连后，后续发送的消息仍可收到流式事件", async ({ page }) => {
  const name = `场景4b-${Date.now()}`;
  const sessionId = await createSession(page, name);
  await waitForSseOpen(page);

  await forceDisconnectSse(sessionId);
  await waitForSseOpen(page);

  await sendMessage(page, `post-reconnect-${Date.now()}`);
  await expect(page.locator(".message-bubble--live")).toBeVisible({ timeout: 5_000 });
  await waitForStreamingComplete(page);
  await expect(page.locator(".message-bubble--assistant").last()).toBeVisible();
});

test("场景5: SSE 在 delta 阶段断开，重连后 history 补拉完成 run", async ({ page }) => {
  const name = `场景5-${Date.now()}`;
  const sessionId = await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `final-loss-test-${Date.now()}`);
  await expect(page.locator(".message-bubble--live")).toBeVisible({ timeout: 5_000 });
  await forceDisconnectSse(sessionId);

  await waitForStreamingComplete(page);
  await expect(page.locator(".message-bubble--assistant").last()).toBeVisible({ timeout: 15_000 });
});

test("场景6: 点击 Stop 后出现 aborted notice，composer 解锁", async ({ page }) => {
  const name = `场景6-${Date.now()}`;
  await createSession(page, name);
  await waitForSseOpen(page);

  await sendMessage(page, `abort-test-${Date.now()}`);

  await expect(page.getByRole("button", { name: "Stop" })).toBeEnabled({ timeout: 5_000 });
  await page.getByRole("button", { name: "Stop" }).click();

  await expect(page.locator(".message-bubble--notice")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".message-bubble--notice")).toContainText("aborted");
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled({ timeout: 5_000 });
  await expect(page.locator(".composer-panel__input")).toBeEnabled();
});

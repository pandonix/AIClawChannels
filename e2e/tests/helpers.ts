import { type Page, expect } from "@playwright/test";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function openHistoryPanel(page: Page): Promise<void> {
  const panel = page.getByTestId("session-panel");
  if (await panel.isVisible().catch(() => false)) {
    return;
  }

  await closeSettingsDrawer(page);
  await page.getByTestId("nav-history-toggle").click();
  await expect(panel).toBeVisible();
}

export async function closeHistoryPanel(page: Page): Promise<void> {
  const panel = page.getByTestId("session-panel");
  if (!(await panel.isVisible().catch(() => false))) {
    return;
  }

  await page.getByRole("button", { name: "关闭会话面板" }).click();
  await expect(panel).toBeHidden();
}

export async function openSettingsDrawer(page: Page): Promise<void> {
  const drawer = page.getByTestId("workspace-drawer");
  if (await drawer.isVisible().catch(() => false)) {
    return;
  }

  await closeHistoryPanel(page);
  await page.getByTestId("chat-settings-button").click();
  await expect(drawer).toBeVisible();
}

export async function closeSettingsDrawer(page: Page): Promise<void> {
  const drawer = page.getByTestId("workspace-drawer");
  if (!(await drawer.isVisible().catch(() => false))) {
    return;
  }

  await page.getByRole("button", { name: "关闭设置抽屉" }).click();
  await expect(drawer).toBeHidden();
}

export async function createSession(page: Page, name: string): Promise<string> {
  await openHistoryPanel(page);
  await page.getByTestId("session-create-input").fill(name);
  await page.getByTestId("session-create-button").click();
  await expect(page.getByTestId("chat-title")).toContainText(name, { timeout: 5_000 });
  const sessions = await listSessionsFromApi();
  const session = sessions.find((s) => s.title === name);
  if (!session) throw new Error(`Session "${name}" not found after creation`);
  await closeHistoryPanel(page);
  return session.id;
}

export async function selectSession(page: Page, name: string): Promise<void> {
  await openHistoryPanel(page);
  await page.getByTestId("session-list").getByRole("button", { name }).first().click();
  await expect(page.getByTestId("chat-title")).toContainText(name, { timeout: 5_000 });
}

export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByTestId("composer-input").fill(text);
  await page.getByTestId("send-message-button").click();
}

export async function waitForStreamingComplete(page: Page): Promise<void> {
  await expect(page.getByTestId("abort-run-button")).toBeDisabled({ timeout: 15_000 });
}

export async function waitForSseOpen(page: Page): Promise<void> {
  await expect(page.getByTestId("sse-status")).toContainText("SSE 已连接", { timeout: 10_000 });
}

export async function waitForSseNotOpen(page: Page): Promise<void> {
  await expect(page.getByTestId("sse-status")).not.toContainText("SSE 已连接", { timeout: 5_000 });
}

export async function forceDisconnectSse(sessionId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/dev/sse-disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error(`sse-disconnect failed: ${res.status}`);
}

export async function listSessionsFromApi(): Promise<Array<{ id: string; title: string }>> {
  const res = await fetch(`${BACKEND_URL}/api/sessions`);
  const data = (await res.json()) as { sessions: Array<{ id: string; title: string }> };
  return data.sessions;
}

import { type Page, expect } from "@playwright/test";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function openHistory(page: Page): Promise<void> {
  await page.getByRole("button", { name: "History" }).first().click();
  await expect(page.locator(".history-panel")).toHaveClass(/history-panel--open/);
}

export async function createSession(page: Page, name: string): Promise<string> {
  await openHistory(page);
  await page.locator("#new-session-name").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".chat-stage__intro h2")).toContainText(name, { timeout: 5_000 });
  const sessions = await listSessionsFromApi();
  const session = sessions.find((s) => s.title === name);
  if (!session) {
    throw new Error(`Session "${name}" not found after creation`);
  }
  return session.id;
}

export async function selectSession(page: Page, name: string): Promise<void> {
  await openHistory(page);
  await page.locator(".history-card").filter({ hasText: name }).click();
  await expect(page.locator(".chat-stage__intro h2")).toContainText(name, { timeout: 5_000 });
}

export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.locator(".composer-panel__input").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

export async function waitForStreamingComplete(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled({ timeout: 15_000 });
}

export async function waitForSseOpen(page: Page): Promise<void> {
  await expect(
    page.locator(".signal-pill").filter({ hasText: "Connected / Streaming" }).first()
  ).toBeVisible({ timeout: 10_000 });
}

export async function waitForSseNotOpen(page: Page): Promise<void> {
  await expect(
    page.locator(".signal-pill").filter({ hasText: "Connected / Streaming" }).first()
  ).toBeHidden({ timeout: 5_000 });
}

export async function forceDisconnectSse(sessionId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/dev/sse-disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) {
    throw new Error(`sse-disconnect failed: ${res.status}`);
  }
}

export async function listSessionsFromApi(): Promise<Array<{ id: string; title: string }>> {
  const res = await fetch(`${BACKEND_URL}/api/sessions`);
  const data = (await res.json()) as { sessions: Array<{ id: string; title: string }> };
  return data.sessions;
}

import { type Page, expect } from "@playwright/test";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function createSession(page: Page, name: string): Promise<string> {
  await page.locator("#new-session-name").fill(name);
  await page.getByRole("button", { name: "New Session" }).click();
  await expect(
    page.locator(".session-stack").getByText(name, { exact: false })
  ).toBeVisible({ timeout: 5_000 });
  const sessions = await listSessionsFromApi();
  const session = sessions.find((s) => s.title === name);
  if (!session) throw new Error(`Session "${name}" not found after creation`);
  return session.id;
}

export async function selectSession(page: Page, name: string): Promise<void> {
  await page.locator(".session-card").filter({ hasText: name }).click();
  await expect(page.locator(".chat-shell h2")).toContainText(name, { timeout: 5_000 });
}

export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.locator(".composer-shell__input").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

export async function waitForStreamingComplete(page: Page): Promise<void> {
  // Stop is enabled only while activeRunId is set; disabled means run cleared
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled({ timeout: 15_000 });
}

export async function waitForSseOpen(page: Page): Promise<void> {
  // The SSE pill renders "SSE open" only when connectionState === "open".
  // Other states (reconnecting, error) render with status-pill--muted or status-pill--error.
  await expect(
    page.locator(".chat-header__status .status-pill").filter({ hasText: "SSE open" })
  ).toBeVisible({ timeout: 10_000 });
}

export async function waitForSseNotOpen(page: Page): Promise<void> {
  await expect(
    page.locator(".chat-header__status .status-pill").filter({ hasText: "SSE open" })
  ).toBeHidden({ timeout: 5_000 });
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

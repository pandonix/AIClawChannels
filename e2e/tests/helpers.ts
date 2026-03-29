import { expect, type Page } from "@playwright/test";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:3001";

export async function listSessionsFromApi(): Promise<
  Array<{ id: string; title: string }>
> {
  const response = await fetch(`${BACKEND_URL}/api/sessions`);
  const payload = (await response.json()) as {
    sessions: Array<{ id: string; title: string }>;
  };
  return payload.sessions;
}

export async function openSessionsDrawer(page: Page) {
  await page.getByRole("button", { name: "Sessions" }).click();
  await expect(page.getByText("Sessions Drawer")).toBeVisible();
}

export async function createSession(page: Page, name: string) {
  await openSessionsDrawer(page);
  await page.getByRole("button", { name: "New" }).click();
  await page.getByLabel("Session Name").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("header h1")).toContainText(name);

  const sessions = await listSessionsFromApi();
  const session = sessions.find((entry) => entry.title === name);
  if (!session) {
    throw new Error(`Session "${name}" not found after creation`);
  }

  return session.id;
}

export async function openSettingsSheet(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Session Settings")).toBeVisible();
}

export async function renameSession(
  page: Page,
  title: string,
  agentId = "agent.e2e.test",
) {
  await openSettingsSheet(page);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Agent ID").fill(agentId);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("header h1")).toContainText(title);
}

export async function selectSession(page: Page, title: string) {
  await openSessionsDrawer(page);
  await page.getByRole("button", { name: `Open session ${title}` }).click();
  await expect(page.locator("header h1")).toContainText(title);
}

export async function sendMessage(
  page: Page,
  text: string,
  mode: "button" | "keyboard" = "button",
) {
  const composer = page.getByLabel("Composer draft");
  await composer.fill(text);

  if (mode === "keyboard") {
    await composer.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
    return;
  }

  await page.getByRole("button", { name: "Send" }).click();
}

export async function waitForConnectionStatus(page: Page, status: string) {
  await expect(
    page.getByRole("button", {
      name: new RegExp(`Connection status ${status}`, "i"),
    }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function waitForRunSettled(page: Page) {
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled({
    timeout: 15_000,
  });
}

export async function waitForAssistantReply(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeVisible({
    timeout: 15_000,
  });
}

export async function forceDisconnectSse(sessionId: string) {
  const response = await fetch(`${BACKEND_URL}/dev/sse-disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error(`sse-disconnect failed: ${response.status}`);
  }
}

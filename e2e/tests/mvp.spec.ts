import { expect, test } from "@playwright/test";
import {
  createSession,
  forceDisconnectSse,
  renameSession,
  sendMessage,
  waitForAssistantReply,
  waitForConnectionStatus,
  waitForRunSettled,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sessions" }).waitFor();
  await waitForConnectionStatus(page, "open");
});

test("keyboard flow covers drawer, dialog, settings, composer send and stop", async ({
  page,
}) => {
  const name = `keyboard-flow-${Date.now()}`;
  const renamedTitle = `${name}-renamed`;

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Sessions" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Sessions Drawer")).toBeVisible();

  await page.getByRole("button", { name: "New" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("New Session")).toBeVisible();

  await page.getByLabel("Session Name").fill(name);
  await page.getByLabel("Session Name").press("Enter");
  await expect(page.locator("header h1")).toContainText(name);

  await page.getByRole("button", { name: "Settings" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Session Settings")).toBeVisible();
  await page.getByLabel("Title").fill(renamedTitle);
  await page.getByLabel("Agent ID").fill("agent.keyboard.flow");
  await page.getByLabel("Agent ID").press("Enter");
  await expect(page.locator("header h1")).toContainText(renamedTitle);

  await sendMessage(page, `abort keyboard ${Date.now()}`, "keyboard");
  await expect(page.getByRole("button", { name: "Stop" })).toBeEnabled({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Stop" }).focus();
  await page.keyboard.press("Enter");
  await waitForRunSettled(page);
  await expect(page.getByText("Run aborted.", { exact: false })).toBeVisible({
    timeout: 10_000,
  });
});

test("session create, rename, send and final message update the workspace", async ({
  page,
}) => {
  const name = `workspace-flow-${Date.now()}`;
  const renamedTitle = `${name}-edited`;
  const prompt = `workspace final smoke ${Date.now()}`;

  await createSession(page, name);
  await renameSession(page, renamedTitle, "agent.workspace.flow");
  await sendMessage(page, prompt);
  await waitForRunSettled(page);

  await waitForAssistantReply(page, `原始消息: ${prompt}`);
  await expect(page.getByText(prompt, { exact: true })).toBeVisible();
  await expect(page.locator("header h1")).toContainText(renamedTitle);
});

test("sse reconnect recovers to open and history backfill lands final message", async ({
  page,
}) => {
  const name = `reconnect-flow-${Date.now()}`;
  const sessionId = await createSession(page, name);
  const prompt = `backfill smoke ${Date.now()}`;

  await sendMessage(page, prompt);
  await page.waitForTimeout(150);
  await forceDisconnectSse(sessionId);

  await waitForConnectionStatus(page, "reconnecting");
  await waitForConnectionStatus(page, "open");
  await waitForRunSettled(page);
  await waitForAssistantReply(page, `原始消息: ${prompt}`);
});

test("connection diagnostics popover shows session, run and last error fields", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: /Connection status open/i })
    .click();

  await expect(page.getByText("Connection Diagnostics")).toBeVisible();
  await expect(page.getByText("Status", { exact: true })).toBeVisible();
  await expect(page.getByText("Session", { exact: true })).toBeVisible();
  await expect(page.getByText("Run", { exact: true })).toBeVisible();
  await expect(page.getByText("Last Error", { exact: true })).toBeVisible();
});

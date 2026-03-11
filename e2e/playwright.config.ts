import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";
const backendURL = process.env.BACKEND_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "npm run dev:backend --prefix ..",
      url: `${backendURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        MOCK_GATEWAY: "true",
        NODE_ENV: "development"
      }
    },
    {
      command: "npm run dev:frontend --prefix ..",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
});

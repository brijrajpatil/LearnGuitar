import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8642",
    // The installed Chrome, so nothing extra downloads. In CI, Playwright's own Chromium works too.
    channel: process.env.CI ? undefined : "chrome",
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8642",
    reuseExistingServer: true,
  },
})

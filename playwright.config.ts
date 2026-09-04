import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    viewport: { width: 420, height: 860 },
    screenshot: "only-on-failure",
    // The sandbox ships its own Chromium; use it when present instead of downloading one.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  webServer: {
    command: "DATABASE_URL=file:./data/e2e.db NEXT_PUBLIC_APP_URL=http://localhost:3100 npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

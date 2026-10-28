import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
export default defineConfig({
  testDir: "tests/live",
  testMatch: "**/*.browser.ts",
  workers: 1,
  timeout: 55000,
  use: {
    baseURL: "http://127.0.0.1:3200",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev -- --port 3200",
    url: "http://127.0.0.1:3200/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      AI_PROVIDER: "google",
      DEV_DEMO_DEBUG: "true",
      DATABASE_PATH: join(tmpdir(), `dead-air-live-${randomUUID()}.sqlite`),
    },
  },
});

import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    env: {
      SAVE_STORAGE: "ephemeral",
      AI_PROVIDER: "scripted",
      GEMINI_API_KEY: "",
      DATABASE_PATH: join(tmpdir(), `dead-air-browser-${randomUUID()}.sqlite`),
    },
    timeout: 120000,
  },
});

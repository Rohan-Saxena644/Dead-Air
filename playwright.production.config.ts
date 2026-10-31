import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: "http://127.0.0.1:3501" },
  webServer: {
    command: "node scripts/start.mjs",
    url: "http://127.0.0.1:3501/api/health",
    reuseExistingServer: false,
    env: {
      PORT: "3501",
      HOSTNAME: "127.0.0.1",
      AI_PROVIDER: "scripted",
      GEMINI_API_KEY: "",
      SAVE_STORAGE: "ephemeral",
      DEV_DEBUG: "false",
      DATABASE_PATH: join(
        tmpdir(),
        `dead-air-production-${randomUUID()}.sqlite`,
      ),
    },
    timeout: 60000,
  },
});

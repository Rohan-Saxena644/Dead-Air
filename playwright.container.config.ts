import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({
  ...config,
  webServer: undefined,
  use: {
    ...config.use,
    baseURL: process.env.CONTAINER_BASE_URL || "http://127.0.0.1:3400",
  },
});

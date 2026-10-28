import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
export default defineConfig({
  test: {
    include: ["tests/live/**/*.eval.ts"],
    fileParallelism: false,
    testTimeout: 55000,
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/server-only.ts", import.meta.url),
      ),
    },
  },
});

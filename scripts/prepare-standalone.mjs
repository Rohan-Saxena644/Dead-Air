import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

// Next's standalone server deliberately omits static assets and arbitrary SQL.
// Package both so local production startup matches the Docker runtime.
for (const [source, target] of [
  [".next/static", ".next/standalone/.next/static"],
  ["src/lib/db/migrations", ".next/standalone/src/lib/db/migrations"],
  ["public", ".next/standalone/public"],
]) {
  if (existsSync(source))
    cpSync(source, join(process.cwd(), target), { recursive: true });
}

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
process.env.NODE_ENV = "production";
// Existing deployment variables win; local files follow Next's priority order.
for (const name of [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
]) {
  if (existsSync(join(root, name))) process.loadEnvFile(join(root, name));
}
process.env.DATABASE_PATH = resolve(
  root,
  process.env.DATABASE_PATH || "data/dead-air.sqlite",
);
process.env.HOSTNAME ||= "0.0.0.0";
const entry = join(root, ".next/standalone/server.js");
if (!existsSync(entry)) {
  console.error(
    "Production build missing. Run npm run build before npm start.",
  );
  process.exit(1);
}
await import(pathToFileURL(entry).href);

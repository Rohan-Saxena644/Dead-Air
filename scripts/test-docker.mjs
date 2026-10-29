import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
const suffix = randomUUID();
const container = `dead-air-check-${suffix}`;
const volume = `${container}-data`;
const port = process.env.DOCKER_TEST_PORT || "3400";
if (!/^\d+$/.test(port) || +port < 1024 || +port > 65535)
  throw new Error("Invalid DOCKER_TEST_PORT.");
const base = `http://127.0.0.1:${port}`;
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
async function ready() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const r = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (r.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Container health did not become ready.");
}
try {
  docker(
    "run",
    "--detach",
    "--name",
    container,
    "--publish",
    `127.0.0.1:${port}:3000`,
    "--env",
    "AI_PROVIDER=scripted",
    "--env",
    "GEMINI_API_KEY=",
    "--env",
    "SAVE_STORAGE=ephemeral",
    "--mount",
    `type=volume,source=${volume},target=/app/data`,
    process.env.DOCKER_TEST_IMAGE || "dead-air:beta",
  );
  await ready();
  const empty = await fetch(`${base}/api/session`).then((r) => r.json());
  if (!empty.saveNotice?.includes("temporary"))
    throw new Error("Free-demo disclosure missing before session.");
  const created = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { origin: base },
  });
  const cookie = created.headers.get("set-cookie")?.split(";")[0];
  const initial = await created.json();
  if (!cookie || initial.mode !== "Scripted fallback")
    throw new Error("Container session creation failed.");
  const headers = { "Content-Type": "application/json", origin: base, cookie };
  const response = await fetch(`${base}/api/action`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "pause",
      actionId: randomUUID(),
      version: initial.state.version,
    }),
  });
  const paused = await response.json();
  if (!response.ok || !paused.state.paused)
    throw new Error("Native SQLite action failed.");
  const html = await fetch(base).then((r) => r.text());
  const asset = html.match(/src="([^\"]+\.js[^\"]*)"/)?.[1];
  if (!asset || (await fetch(new URL(asset, base))).status !== 200)
    throw new Error("Container static assets failed.");
  const runtime = JSON.parse(
    docker(
      "exec",
      container,
      "node",
      "-e",
      `const fs=require('node:fs');console.log(JSON.stringify({uid:process.getuid(),node:process.version,compilerPresent:fs.existsSync('/usr/bin/g++'),localEnvironmentFilePresent:fs.existsSync('/app/.env.local'),keyPresent:!!process.env.GEMINI_API_KEY}))`,
    ),
  );
  if (
    runtime.uid === 0 ||
    runtime.compilerPresent ||
    runtime.localEnvironmentFilePresent ||
    runtime.keyPresent
  )
    throw new Error("Runtime isolation check failed.");
  docker("restart", container);
  await ready();
  const restored = await fetch(`${base}/api/session`, {
    headers: { cookie },
  }).then((r) => r.json());
  if (
    !restored.state?.paused ||
    restored.state.version !== paused.state.version
  )
    throw new Error("Mounted SQLite save did not survive restart.");
  if (process.argv.includes("--browser")) {
    execFileSync(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config",
        "playwright.container.config.ts",
      ],
      { stdio: "inherit", env: { ...process.env, CONTAINER_BASE_URL: base } },
    );
  }
  const report = {
    checkedAt: new Date().toISOString(),
    image: process.env.DOCKER_TEST_IMAGE || "dead-air:beta",
    runtime,
    health: 200,
    staticAsset: 200,
    temporarySaveDisclosure: true,
    nativeSqliteWrite: true,
    saveSurvivedMountedRestart: true,
    inferenceMode: initial.mode,
    browserSuite: process.argv.includes("--browser"),
  };
  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/docker-smoke.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  // Only the two UUID-named resources created for this disposable check are removed.
  try {
    docker("rm", "--force", container);
  } catch {}
  try {
    docker("volume", "rm", volume);
  } catch {}
}

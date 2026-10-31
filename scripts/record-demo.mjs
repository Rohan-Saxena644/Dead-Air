// Run after npm run build: node scripts/record-demo.mjs
// Requires the existing Playwright Chromium installation. No keys are logged.
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const directory = resolve("artifacts/demo");
mkdirSync(directory, { recursive: true });
if (existsSync(join(directory, "dead-air-demo.webm")))
  throw new Error(
    "Move the previous dead-air-demo.webm before recording again.",
  );
mkdirSync("docs/screenshots", { recursive: true });
const url = "http://127.0.0.1:3502";
// An occupied port is an error: never record an unrelated server.
try {
  await fetch(`${url}/api/health`);
  throw new Error("Demo port 3502 is already occupied.");
} catch (e) {
  if (e.message.includes("occupied")) throw e;
}
const server = spawn(process.execPath, ["scripts/start.mjs"], {
  env: {
    ...process.env,
    PORT: "3502",
    HOSTNAME: "127.0.0.1",
    APP_BASE_URL: url,
    DATABASE_PATH: join(tmpdir(), `dead-air-demo-${randomUUID()}.sqlite`),
    AI_PROVIDER: "google",
    DEV_DEMO_DEBUG: "false",
    SAVE_STORAGE: "ephemeral",
  },
  stdio: ["ignore", "ignore", "ignore"],
  windowsHide: true,
});
let browser, context;
const captions = [];
let started;
function timestamp(seconds, separator = ",") {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error("Demo server exited before recording.");
    if (
      await fetch(`${url}/api/health`)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await delay(300);
  }
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
    recordVideo: { dir: directory, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const video = page.video();
  started = performance.now();
  await page.goto(url);
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .waitFor({ state: "visible" });
  // Presentation overlays only: game state and MORA responses are never edited.
  await page.evaluate(() => {
    const caption = document.createElement("div");
    caption.id = "demo-caption";
    Object.assign(caption.style, {
      position: "fixed",
      bottom: "20px",
      left: "15%",
      width: "70%",
      padding: "16px 24px",
      background: "rgba(6,12,10,.96)",
      border: "1px solid #718974",
      color: "#edf1e8",
      font: "20px/1.5 system-ui",
      textAlign: "center",
      zIndex: "99999",
      pointerEvents: "none",
      borderRadius: "4px",
    });
    document.body.append(caption);
    const pointer = document.createElement("div");
    pointer.id = "demo-pointer";
    Object.assign(pointer.style, {
      position: "fixed",
      width: "15px",
      height: "15px",
      border: "2px solid #fff",
      background: "#849e77",
      borderRadius: "50%",
      zIndex: "100000",
      pointerEvents: "none",
      left: "960px",
      top: "540px",
    });
    document.body.append(pointer);
    document.addEventListener("pointermove", (event) => {
      pointer.style.left = `${event.clientX}px`;
      pointer.style.top = `${event.clientY}px`;
    });
  });
  const at = async (seconds) => {
    const remaining = started + seconds * 1000 - performance.now();
    if (remaining > 0) await delay(remaining);
  };
  const caption = async (text) => {
    captions.push({ start: (performance.now() - started) / 1000, text });
    await page.locator("#demo-caption").evaluate((el, value) => {
      el.textContent = value;
    }, text);
  };
  const click = async (locator, action = false) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error("Demo control not visible.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 18,
    });
    await delay(250);
    if (action) {
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/action") && r.request().method() === "POST",
      );
      await locator.click();
      const r = await response;
      if (!r.ok()) throw new Error(`Demo action failed: ${r.status()}`);
      await delay(250);
    } else await locator.click();
  };
  const button = (name) =>
    page.getByRole("button", { name, exact: typeof name === "string" });
  const screenshot = async (name) => {
    await page.locator("#demo-caption").evaluate((el) => {
      el.style.visibility = "hidden";
    });
    await page.locator("#demo-pointer").evaluate((el) => {
      el.style.visibility = "hidden";
    });
    await page.screenshot({ path: `docs/screenshots/submission-${name}.png` });
    await page.locator("#demo-caption").evaluate((el) => {
      el.style.visibility = "visible";
    });
    await page.locator("#demo-pointer").evaluate((el) => {
      el.style.visibility = "visible";
    });
  };
  await caption("DEAD AIR · A haunted archive. You are its incoming operator.");
  await screenshot("opening");
  await at(10);
  await click(button("Start investigation"));
  await caption(
    "A message queued in 2019 keeps arriving. The queue is your first lead.",
  );
  await at(19);
  await click(button("Inspect message"), true);
  await at(27);
  await click(button(/^Restart worker/), true);
  await caption(
    "Restarting retries the write. Another record appears, but the receipt is still missing.",
  );
  await at(36);
  await click(button("Inspect relevant trace"), true);
  await at(43);
  await click(button(/^Pause delivery/), true);
  await caption(
    "Pause contains retries without deleting evidence. Compare the write with its confirmation.",
  );
  await at(50);
  const question =
    "Compare two theories: did the write fail, or did its confirmation fail? Use the discovered trace without listing the full repair sequence.";
  await page.getByRole("textbox", { name: "Ask MORA" }).fill(question);
  const inference = page.waitForResponse(
    (r) => r.url().endsWith("/api/operator"),
    { timeout: 38000 },
  );
  await click(button("Send to MORA"));
  await caption(
    "MORA consults discovered context and read-only tools. The visible label identifies live or scripted mode.",
  );
  const reply = await (await inference).json();
  await caption(
    `${reply.mode} · MORA advises; the simulator alone changes the machine.`,
  );
  writeFileSync(
    join(directory, "operator-record.json"),
    JSON.stringify(
      {
        question,
        mode: reply.mode,
        reply: reply.reply,
        note: "Actual response in this recording; no latency benchmark.",
      },
      null,
      2,
    ),
  );
  await at(82);
  await screenshot("investigation");
  await click(button("Read runbook"), true);
  await caption(
    "The recovered runbook supplies explicit help when you choose to read it.",
  );
  await at(92);
  await click(button("Close evidence"));
  await click(button(/^Idempotency/), true);
  await at(99);
  await click(button(/^ACK route/), true);
  await at(105);
  await click(button(/^Resume delivery/), true);
  await caption(
    "Existing result reused. Receipt received. Queue empty. Earlier duplicate history stays intact.",
  );
  await at(113);
  await caption(
    "STORY SPOILERS AHEAD · The archive explains whose words the machine has been repeating.",
  );
  await at(119);
  await click(page.getByRole("button", { name: /^VAULT/ }), true);
  await click(button(/An inventory of ordinary things/), true);
  await at(127);
  await click(button("Close evidence"));
  await click(button(/Until someone can take over/), true);
  await caption(
    "The unfinished obligation is preservation. Read the final request before choosing the archive’s future.",
  );
  await at(135);
  await click(button("Close evidence"));
  await click(button("Read custody comparison"), true);
  await caption(
    "An unsigned label conflicts with the original catalog. Attribution is a separate question from delivery.",
  );
  await at(143);
  await click(button("Close evidence"));
  await click(button("Credit the original speaker and depositor"), true);
  await click(button("Prepare verified handover index"), true);
  await at(149);
  await click(button("Preserve archive"));
  await caption(
    "A verified index is prepared, not proof of a download or another custodian receiving it.",
  );
  await at(155);
  await click(button("Confirm preservation"), true);
  await page
    .getByRole("heading", { name: "A place for what remains.", exact: true })
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot("ending");
  await caption(
    "Preserve / organized · Two main endings, four authored variations shaped by the custody decision.",
  );
  await at(163);
  await page.getByLabel("Completed outcomes").scrollIntoViewIfNeeded();
  await caption(
    "Replay changes your decisions, not the central mystery. Browser badges remember completed variations.",
  );
  await at(172);
  await click(button("Replay episode"));
  await caption(
    "A fresh investigation. Deterministic consequences; Google-hosted Gemma as your investigation partner.",
  );
  await at(178);
  const end = (performance.now() - started) / 1000;
  writeFileSync(
    join(directory, "caption-timing.json"),
    JSON.stringify({ end, captions }, null, 2),
  );
  writeFileSync(
    join(directory, "captions.srt"),
    captions
      .map(
        (c, i) =>
          `${i + 1}\n${timestamp(c.start)} --> ${timestamp(captions[i + 1]?.start ?? end)}\n${c.text}\n`,
      )
      .join("\n"),
  );
  writeFileSync(
    join(directory, "transcript.md"),
    `# DEAD AIR — actual gameplay captions\n\nSilent browser recording; no fabricated dialogue or gameplay. Actual operator mode: ${reply.mode}. No waiting time was cut.\n\n` +
      captions
        .map((c) => `- ${timestamp(c.start, ".")} — ${c.text}`)
        .join("\n") +
      "\n",
  );
  await context.close();
  context = undefined;
  const source = await video.path();
  const target = join(directory, "dead-air-demo.webm");
  if (existsSync(target))
    throw new Error(
      "Move the previous dead-air-demo.webm before recording again.",
    );
  renameSync(source, target);
  const ffmpeg = process.env.FFMPEG_PATH;
  if (ffmpeg) {
    const converted = spawnSync(
      ffmpeg,
      [
        "-y",
        "-i",
        target,
        "-c:v",
        "libx264",
        "-crf",
        "20",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        join(directory, "dead-air-demo.mp4"),
      ],
      { windowsHide: true, encoding: "utf8" },
    );
    if (converted.status !== 0)
      console.log("H.264 conversion unavailable; retained the actual WebM.");
  }
  console.log(
    `Recorded actual 1920x1080 gameplay to ${target}. Operator mode: ${reply.mode}.`,
  );
} finally {
  await context?.close();
  await browser?.close();
  server.kill();
}

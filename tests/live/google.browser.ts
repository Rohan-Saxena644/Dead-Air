import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
test("live Gemma conversation through saved server session", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(page.locator(".incident-strip")).toContainText(
    "Gemma · Google AI Studio",
  );
  await page.getByRole("tab", { name: "Traces" }).click();
  await page.getByRole("button", { name: "Pause delivery ON" }).click();
  const before = await page.request.get("/api/session").then((r) => r.json());
  await page
    .getByRole("textbox", { name: "Ask MORA" })
    .fill(
      "Explain why a write can succeed while its acknowledgement fails. What should I inspect next?",
    );
  await page.getByRole("button", { name: "Send to MORA" }).click();
  await expect(
    page.getByRole("button", { name: /Restart worker/ }),
  ).toBeEnabled();
  await expect(page.locator(".chat-entry.assistant")).toHaveCount(2, {
    timeout: 50000,
  });
  const answer = page.locator(".chat-entry.assistant").last();
  await expect(answer).toContainText("Gemma · Google AI Studio");
  await expect(answer).toContainText(/acknowledg|receipt|confirm/i);
  const after = await page.request.get("/api/session").then((r) => r.json());
  const debug = await page.request.get("/api/debug").then((r) => r.json());
  const metadata = debug.invocations[0];
  expect(metadata.provider).toBe("google");
  expect(metadata.validation).toBe("passed");
  expect(metadata.fallbackReason).toBeNull();
  expect(metadata.calls.length).toBeGreaterThan(0);
  expect(metadata.stateVersion).toBe(before.state.version);
  expect(after.state.queue.attempts).toEqual(before.state.queue.attempts);
  expect(after.state.records).toEqual(before.state.records);
  expect(after.conversation.at(-1).mode).toBe("Gemma · Google AI Studio");
  mkdirSync("data", { recursive: true });
  writeFileSync(
    "data/google-live-browser.json",
    JSON.stringify(
      {
        evaluatedAt: new Date().toISOString(),
        metadata,
        reply: after.conversation.at(-1),
      },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: "docs/screenshots/mora-google-live.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

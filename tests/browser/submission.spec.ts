import { test, expect } from "@playwright/test";
for (const ending of ["preserve", "silence"] as const)
  for (const prepared of [false, true]) {
    test(`${ending} / ${prepared ? "verified" : "sealed"}, reload and local badge`, async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "Start investigation", exact: true })
        .click();
      await expect(
        page.getByText("CURRENT OBJECTIVE", { exact: true }),
      ).toBeVisible();
      for (const action of [
        "queue",
        "trace",
        "pause",
        "idempotency",
        "repair",
        "resume",
        "archive",
        "read:manifest",
        "read:request",
      ]) {
        const r = await page.request.get("/api/session");
        const s = (await r.json()).state;
        const result = await page.request.post("/api/action", {
          data: { action, version: s.version, actionId: crypto.randomUUID() },
        });
        expect(result.ok()).toBe(true);
      }
      await page.reload();
      await page
        .getByRole("button", { name: "Continue investigation" })
        .click();
      const branch = page.getByRole("region", {
        name: "Optional archive verification",
      });
      await branch
        .getByRole("button", { name: "Read custody comparison" })
        .click();
      await page.getByRole("button", { name: "Close evidence" }).click();
      if (prepared) {
        await branch
          .getByRole("button", {
            name: "Use the delivery account as the speaker",
          })
          .click();
        await expect(
          page.getByRole("status", { name: "Action result" }),
        ).toContainText("does not match");
        await branch
          .getByRole("button", {
            name: "Credit the original speaker and depositor",
          })
          .click();
        await branch
          .getByRole("button", { name: "Prepare verified handover index" })
          .click();
      }
      await page
        .getByRole("textbox", { name: "Ask MORA" })
        .fill("Compare the attribution theories.");
      await page.getByRole("button", { name: "Send to MORA" }).click();
      await expect(page.locator(".chat-entry.assistant").last()).toContainText(
        "Scripted fallback",
      );
      await expect(page.locator(".chat-entry.assistant").last()).toContainText(
        "Ada",
      );
      await page
        .getByRole("button", {
          name: ending === "preserve" ? "Preserve archive" : "Finish shutdown",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name:
            ending === "preserve" ? "Confirm preservation" : "Confirm shutdown",
        })
        .click();
      const title =
        ending === "preserve"
          ? prepared
            ? "A place for what remains."
            : "The box without a new label."
          : prepared
            ? "An address for the morning."
            : "Nothing left waiting.";
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Completed outcomes")).toContainText("✓");
      await page.reload();
      await page
        .getByRole("button", { name: "Continue investigation" })
        .click();
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Replay episode" }).click();
      await expect(
        page.getByText("CURRENT OBJECTIVE", { exact: true }),
      ).toBeVisible();
    });
  }
test("missing save recovers and stale suggestions cannot apply", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Ask MORA" }).fill("Help");
  await page.getByRole("button", { name: "Send to MORA" }).click();
  await expect(page.locator(".suggestion")).toBeVisible();
  const s = (await (await page.request.get("/api/session")).json()).state;
  await page.getByRole("button", { name: /^Pause delivery/ }).click();
  await expect(page.locator(".suggestion")).toHaveCount(0);
  const latest = (await (await page.request.get("/api/session")).json()).state;
  const rejected = await page.request.post("/api/action", {
    data: {
      action: "queue",
      actionId: crypto.randomUUID(),
      version: latest.version,
      suggestionVersion: s.version,
    },
  });
  expect(rejected.status()).toBe(409);
  await page.context().clearCookies();
  await page.getByRole("button", { name: /^Restart worker/ }).click();
  await expect(
    page.getByRole("heading", { name: "This console’s save has reset." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New investigation", exact: true })
    .click();
  await expect(
    page.getByText("CURRENT OBJECTIVE", { exact: true }),
  ).toBeVisible();
});
test("ending remains usable when browser storage throws", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Blocked");
    };
    Storage.prototype.getItem = () => {
      throw new Error("Blocked");
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(
    page.getByText("CURRENT OBJECTIVE", { exact: true }),
  ).toBeVisible();
  for (const action of [
    "pause",
    "idempotency",
    "repair",
    "resume",
    "archive",
    "read:manifest",
    "read:request",
    "silence",
  ]) {
    const s = (await (await page.request.get("/api/session")).json()).state;
    expect(
      (
        await page.request.post("/api/action", {
          data: { action, version: s.version, actionId: crypto.randomUUID() },
        })
      ).ok(),
    ).toBe(true);
  }
  await page.reload();
  await page.getByRole("button", { name: "Continue investigation" }).click();
  await expect(page.getByLabel("Completed outcomes")).toContainText("✓");
});

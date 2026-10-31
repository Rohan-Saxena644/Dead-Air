import { test, expect, type Page } from "@playwright/test";
async function begin(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(
    page.getByText("CURRENT OBJECTIVE", { exact: true }),
  ).toBeVisible();
}
async function command(page: Page, text: string) {
  if (
    !(await page
      .getByRole("textbox", { name: "operator@meridian" })
      .isVisible())
  ) {
    await page.getByRole("button", { name: /MERIDIAN SHELL/ }).click();
  }
  await page.getByRole("textbox", { name: "operator@meridian" }).fill(text);
  await page.getByRole("textbox", { name: "operator@meridian" }).press("Enter");
  await expect(page.locator(".terminal-output")).toContainText("complete.");
}
async function solve(page: Page) {
  for (const c of [
    "queue inspect",
    "trace inspect TRC-0001",
    "delivery pause",
    "relay idempotency enable",
    "relay ack-route repair",
    "delivery resume",
    "archive inspect",
  ])
    await command(page, c);
  await page
    .getByRole("button", { name: "An inventory of ordinary things" })
    .click();
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page
    .getByRole("button", { name: "Until someone can take over" })
    .click();
  await page.getByRole("button", { name: "Close evidence" }).click();
}
test("preserve, reload persistence, keyboard terminal and export", async ({
  page,
}) => {
  await begin(page);
  await command(page, "queue inspect");
  await page.reload();
  await page.getByRole("button", { name: "Continue investigation" }).click();
  await expect(page.getByText("AUTO-SAVED · V1")).toBeVisible();
  await solve(page);
  await page
    .getByRole("button", { name: "Preserve archive", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm preservation" }).click();
  await expect(
    page.getByRole("heading", { name: "The box without a new label." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Export investigation" }),
  ).toHaveAttribute("href", "/api/export");
  await page.screenshot({
    path: "docs/screenshots/ending-preserve.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "Continue investigation" }).click();
  await expect(
    page.getByRole("heading", { name: "The box without a new label." }),
  ).toBeVisible();
});
test("silence completes without a restart mistake", async ({ page }) => {
  await begin(page);
  await solve(page);
  await page
    .getByRole("button", { name: "Finish shutdown", exact: true })
    .click();
  await expect(
    page.getByText("Export archive & investigation first"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm shutdown" }).click();
  await expect(
    page.getByRole("heading", { name: "Nothing left waiting." }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/ending-silence.png",
    fullPage: true,
  });
});
test("operator failure keeps controls available", async ({ page }) => {
  await begin(page);
  await page.route("**/api/operator", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Provider timeout fixture." }),
    }),
  );
  await page
    .getByRole("button", { name: "Explain this / ask for a hint" })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Provider timeout fixture." }),
  ).toContainText("Provider timeout fixture.");
  await command(page, "delivery pause");
  await expect(
    page.getByRole("button", { name: "Resume delivery OFF" }),
  ).toBeVisible();
});
test("mobile console has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Systems", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause delivery ON" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "MORA / evidence" }).click();
  await expect(page.getByRole("textbox", { name: "Ask MORA" })).toBeVisible();
});

test("button recovery, pinned evidence, and keyboard dialogs", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("tab", { name: "Queue" }).click();
  await page.getByRole("button", { name: /TRC-0001/ }).click();
  await page
    .getByRole("button", { name: "When a receipt never arrives" })
    .click();
  await expect(
    page.getByRole("button", { name: "Close evidence" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Pause delivery ON" }).click();
  await page.getByRole("button", { name: /Restart worker/ }).click();
  await page.getByRole("button", { name: "Idempotency OFF" }).click();
  await page.getByRole("button", { name: "ACK route FAULT" }).click();
  await page.getByRole("button", { name: "Resume delivery OFF" }).click();
  await expect(
    page.getByText("INCIDENT CONTAINED", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Archive" }).click();
  await page
    .getByRole("button", { name: "An inventory of ordinary things" })
    .click();
  await page.getByRole("button", { name: "Pin to notebook" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Evidence 10/ }).click();
  await expect(page.locator(".notebook")).toContainText(
    "An inventory of ordinary things",
  );
  await page
    .getByRole("button", { name: "Help and investigation guide" })
    .click();
  await expect(page.getByRole("button", { name: "Close help" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Return to console" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("comfort and audio settings survive entry into the console", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Accessibility and comfort" }).click();
  await page
    .getByRole("checkbox", { name: "Disable interference & motion" })
    .check();
  await page.getByRole("button", { name: "Close comfort controls" }).click();
  await page.getByRole("button", { name: "Enable audio" }).click();
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Mute audio" })).toBeVisible();
  await page.getByRole("button", { name: "Accessibility and comfort" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Disable interference & motion" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Mute audio" }).click();
});

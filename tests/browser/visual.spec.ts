import { test, expect } from "@playwright/test";
test("capture desktop and mobile experience and check runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start investigation", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "docs/screenshots/opening-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(
    page.getByText("CURRENT OBJECTIVE", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/console-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: "docs/screenshots/console-laptop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Explain this / ask for a hint" })
    .click();
  await expect(page.locator(".chat-entry.assistant")).toHaveCount(2);
  await expect(page.locator(".chat-entry.assistant").last()).toContainText(
    "Scripted fallback",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/screenshots/console-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Systems", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/systems-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "MORA / evidence" }).click();
  await page.screenshot({
    path: "docs/screenshots/operator-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Return to opening" }).click();
  await page.screenshot({
    path: "docs/screenshots/opening-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

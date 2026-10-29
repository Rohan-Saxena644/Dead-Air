import { test, expect } from "@playwright/test";
test("temporary-save disclosure is visible before and during play on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The fixture server uses the exact free-beta save mode, without inference keys.
  await page.goto("/");
  const notice = page.getByLabel("Temporary demo saves");
  await expect(notice).toContainText("saves are temporary");
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(notice).toContainText("Export your investigation");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/free-beta-mobile.png",
    fullPage: true,
  });
});

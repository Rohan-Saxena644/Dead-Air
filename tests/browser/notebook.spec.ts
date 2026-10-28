import { test, expect } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`guided incident notebook recovers a saved investigation on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 },
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page
      .getByRole("button", { name: "Start investigation", exact: true })
      .click();
    const open = async () => {
      await page
        .getByRole("button", { name: "Open incident notebook" })
        .click();
    };
    const notebook = page.getByLabel("Incident notebook", { exact: true });
    await open();
    await expect(notebook).toContainText("Follow the delivery");
    await expect(notebook).not.toContainText("Enable idempotency");
    await expect(notebook).not.toContainText("2017");
    await notebook
      .getByRole("button", { name: "Inspect queue", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "The outbox" }),
    ).toBeVisible();
    await open();
    await notebook.getByRole("button", { name: "Follow latest trace" }).click();
    await expect(
      page.getByRole("heading", { name: "The broken return path" }),
    ).toBeVisible();
    await open();
    await notebook
      .getByRole("button", { name: "Read recovery runbook" })
      .click();
    await expect(
      page.getByRole("button", { name: "Close evidence" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await open();
    await expect(notebook).toContainText("Make one safe delivery");
    await expect
      .poll(() => notebook.evaluate((element) => element.scrollTop))
      .toBe(0);
    await page.screenshot({
      path: `docs/screenshots/notebook-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await notebook
      .getByRole("button", { name: "Pause delivery", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Action result" }),
    ).toContainText("Delivery paused");
    await notebook
      .getByRole("button", { name: "Enable idempotency", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Action result" }),
    ).toContainText("Repeated deliveries will be recognized");
    await page.reload();
    await page.getByRole("button", { name: "Continue investigation" }).click();
    await open();
    await expect(
      notebook
        .getByRole("listitem")
        .filter({ hasText: "Recognize repeated deliveries" })
        .getByLabel("Complete"),
    ).toBeVisible();
    await notebook
      .getByRole("button", { name: "Repair ACK route", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Action result" }),
    ).toContainText("QUEUE PENDING");
    await notebook.getByRole("button", { name: "Resume and verify" }).click();
    const result = page.getByRole("status", { name: "Action result" });
    await expect(result).toContainText("Delivery acknowledged");
    await expect(result).toContainText("RECORDS +0");
    await expect(result).toContainText("QUEUE EMPTY");
    await expect(notebook).toContainText("Find out what you recovered");
    await open();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/recovery-feedback-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Dismiss action result" }).click();
    await expect(
      page.getByRole("status", { name: "Action result" }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

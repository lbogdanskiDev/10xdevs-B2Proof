import { test, expect } from "./fixtures/base";

test.describe("Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/");

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Check if page title is correct
    await expect(page).toHaveTitle(/B2Proof/);
  });

  test("should have no accessibility violations", async ({ page, makeAxeBuilder }) => {
    await page.goto("/");

    // Run accessibility checks
    const accessibilityScanResults = await makeAxeBuilder().analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should navigate to main sections", async ({ page }) => {
    await page.goto("/");

    // Check if main navigation elements are present
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });
});

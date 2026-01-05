import { test, expect } from "./fixtures/base";

/**
 * Homepage tests for authenticated users
 *
 * Note: Authenticated users are redirected from "/" to "/briefs"
 * These tests verify the redirect behavior and briefs page
 */
test.describe("Homepage (authenticated)", () => {
  test("should redirect authenticated user to briefs page", async ({ page }) => {
    await page.goto("/");

    // Wait for redirect to complete
    await page.waitForLoadState("networkidle");

    // Authenticated users should be redirected to /briefs
    await expect(page).toHaveURL(/\/briefs/);
  });

  test("should have no accessibility violations on briefs page", async ({ page, makeAxeBuilder }) => {
    await page.goto("/briefs");

    // Wait for page to be fully loaded
    await expect(page.getByRole("heading", { name: "Briefs" })).toBeVisible();

    // Run accessibility checks
    const accessibilityScanResults = await makeAxeBuilder().analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should show main content area", async ({ page }) => {
    await page.goto("/briefs");

    // Check if main navigation elements are present
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });
});

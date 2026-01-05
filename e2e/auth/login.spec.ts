import { test, expect } from "../fixtures/base";

/**
 * Login page tests (unauthenticated)
 *
 * These tests run WITHOUT authentication to test the login flow itself.
 * The project "chromium-unauthenticated" in playwright.config.ts handles
 * running these tests without storageState.
 */
test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display login form", async ({ page }) => {
    // Verify login page elements are visible
    await expect(page.getByText("Sign In").first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should show validation error for empty email", async ({ page }) => {
    // Focus and blur email field to trigger validation
    const emailInput = page.getByLabel(/email/i);
    await emailInput.focus();
    await emailInput.blur();

    // Check for validation error
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test("should show validation error for invalid email format", async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("invalid-email");
    await emailInput.blur();

    // Check for format validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("should show validation error for empty password", async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.focus();
    await passwordInput.blur();

    // Check for validation error
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.getByRole("button", { name: /show password|hide password/i });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should have link to registration page", async ({ page }) => {
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/register");
  });

  test("should redirect unauthenticated user from protected route to login", async ({ page }) => {
    // Try to access protected route
    await page.goto("/briefs");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should preserve redirect destination in URL", async ({ page }) => {
    // Try to access protected route
    await page.goto("/briefs/new");

    // Should be redirected to login with redirectTo parameter
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Fill form with invalid credentials
    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.locator('input[name="password"]').fill("wrongpassword");

    // Submit form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for and verify error message
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });

  test("should have no accessibility violations", async ({ makeAxeBuilder }) => {
    const accessibilityScanResults = await makeAxeBuilder().analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

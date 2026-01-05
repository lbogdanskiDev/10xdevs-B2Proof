import type { Page } from "@playwright/test";

/**
 * Test user credentials interface
 */
export interface TestUser {
  email: string;
  password: string;
  role: "creator" | "client";
}

/**
 * Storage state file paths for authenticated sessions
 */
export const AUTH_FILE = {
  creator: "e2e/.auth/creator.json",
  client: "e2e/.auth/client.json",
} as const;

/**
 * Test users configuration
 * Credentials are loaded from environment variables with fallback defaults
 *
 * IMPORTANT: Test users must be pre-created in the test database
 */
export const TEST_USERS: Record<"creator" | "client", TestUser> = {
  creator: {
    email: process.env.E2E_CREATOR_EMAIL || "creator@test.local",
    password: process.env.E2E_CREATOR_PASSWORD || "Test1234!",
    role: "creator",
  },
  client: {
    email: process.env.E2E_CLIENT_EMAIL || "client@test.local",
    password: process.env.E2E_CLIENT_PASSWORD || "Test1234!",
    role: "client",
  },
};

/**
 * Authenticate user via the login form UI
 *
 * This function performs a complete login flow through the UI:
 * 1. Navigate to login page
 * 2. Fill email and password fields
 * 3. Submit the form
 * 4. Wait for successful redirect to /briefs
 *
 * @param page - Playwright Page instance
 * @param user - Test user credentials
 * @throws Error if login fails or redirect doesn't happen within timeout
 */
export async function authenticateViaUI(page: Page, user: TestUser): Promise<void> {
  // Navigate to login page
  await page.goto("/login");

  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]');

  // Fill credentials
  await page.getByLabel(/email/i).fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);

  // Submit form
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for successful redirect to briefs page (indicates successful login)
  await page.waitForURL(/\/briefs/, { timeout: 15000 });
}

/**
 * Check if the current session is authenticated
 *
 * Attempts to navigate to a protected route and checks if
 * the user is redirected to login or stays on the protected page
 *
 * @param page - Playwright Page instance
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto("/briefs");
  const currentUrl = page.url();

  // If we're on /briefs (not redirected to /login), user is authenticated
  return currentUrl.includes("/briefs") && !currentUrl.includes("/login");
}

/**
 * Logout the current user
 *
 * @param page - Playwright Page instance
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button/link in navigation
  const logoutButton = page.getByRole("button", { name: /log ?out|sign ?out/i });

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/\/login/);
  }
}

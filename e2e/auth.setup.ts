import { test as setup, expect } from "@playwright/test";

import { TEST_USERS, AUTH_FILE, authenticateViaUI } from "./helpers/auth";

/**
 * Authentication Setup Project
 *
 * This file runs before all other tests to establish authenticated sessions.
 * It saves browser storage state (cookies, localStorage) to JSON files that
 * are then reused by test projects, avoiding login in every test.
 *
 * Setup runs once per test run, not per test file.
 */

setup.describe("Authentication Setup", () => {
  setup("authenticate as creator", async ({ page }) => {
    // Perform login via UI
    await authenticateViaUI(page, TEST_USERS.creator);

    // Verify we're on the authenticated page
    await expect(page).toHaveURL(/\/briefs/);

    // Wait for page to be interactive (domcontentloaded is faster than networkidle)
    await page.waitForLoadState("domcontentloaded");

    // Save storage state for reuse in tests
    await page.context().storageState({ path: AUTH_FILE.creator });
  });

  // TODO: Enable when client test user is created in the database
  // To create the client user, register via UI or Supabase dashboard with:
  // - Email: client@test.local (or value from E2E_CLIENT_EMAIL)
  // - Password: test123 (or value from E2E_CLIENT_PASSWORD)
  // - Role: client
  setup.skip("authenticate as client", async ({ page }) => {
    // Perform login via UI
    await authenticateViaUI(page, TEST_USERS.client);

    // Verify we're on the authenticated page
    await expect(page).toHaveURL(/\/briefs/);

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    // Save storage state for reuse in tests
    await page.context().storageState({ path: AUTH_FILE.client });
  });
});

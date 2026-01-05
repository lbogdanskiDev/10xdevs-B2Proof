import type { Page } from "@playwright/test";

/**
 * Cleanup utilities for E2E tests
 * Provides helpers for cleaning up test data created during test runs
 */

/**
 * Delete a brief by ID via API
 * @param page - Playwright page object
 * @param briefId - The ID of the brief to delete
 */
export async function deleteBriefById(page: Page, briefId: string): Promise<void> {
  const response = await page.request.delete(`/api/briefs/${briefId}`);

  if (!response.ok()) {
    console.warn(`Failed to delete brief ${briefId}: ${response.status()} ${response.statusText()}`);
  }
}

/**
 * Delete multiple briefs by their IDs
 * @param page - Playwright page object
 * @param briefIds - Array of brief IDs to delete
 */
export async function deleteBriefs(page: Page, briefIds: string[]): Promise<void> {
  await Promise.all(briefIds.map((id) => deleteBriefById(page, id)));
}

/**
 * Extract brief ID from URL after creation
 * @param url - The current page URL (e.g., /briefs/abc-123-def)
 * @returns The brief ID or null if not found
 */
export function extractBriefIdFromUrl(url: string): string | null {
  const match = url.match(/\/briefs\/([a-f0-9-]+)$/);
  return match ? match[1] : null;
}

/**
 * Track created briefs during a test for cleanup
 * Usage in test:
 * ```
 * const tracker = new BriefTracker();
 * // After creating a brief and navigating to detail page
 * tracker.trackFromUrl(page.url());
 * // In afterEach or afterAll
 * await tracker.cleanup(page);
 * ```
 */
export class BriefTracker {
  private briefIds: Set<string> = new Set();

  /**
   * Track a brief ID
   */
  track(briefId: string): void {
    this.briefIds.add(briefId);
  }

  /**
   * Track a brief from its detail page URL
   */
  trackFromUrl(url: string): void {
    const briefId = extractBriefIdFromUrl(url);
    if (briefId) {
      this.briefIds.add(briefId);
    }
  }

  /**
   * Get all tracked brief IDs
   */
  getTrackedBriefs(): string[] {
    return Array.from(this.briefIds);
  }

  /**
   * Clean up all tracked briefs
   */
  async cleanup(page: Page): Promise<void> {
    const ids = this.getTrackedBriefs();
    if (ids.length === 0) {
      return;
    }

    console.log(`Cleaning up ${ids.length} test brief(s)...`);
    await deleteBriefs(page, ids);
    this.briefIds.clear();
  }

  /**
   * Get the count of tracked briefs
   */
  count(): number {
    return this.briefIds.size;
  }

  /**
   * Clear all tracked briefs without deleting them
   */
  clear(): void {
    this.briefIds.clear();
  }
}

/**
 * Delete briefs created by E2E tests based on header pattern
 * This is a more aggressive cleanup that finds all test briefs
 * WARNING: Use with caution, only in test environments
 * @param page - Playwright page object
 * @param headerPattern - Pattern to match in brief headers (default: "Test Brief")
 */
export async function cleanupTestBriefs(page: Page, headerPattern = "Test Brief"): Promise<void> {
  try {
    // Fetch all briefs via API
    const response = await page.request.get("/api/briefs?limit=100");

    if (!response.ok()) {
      console.warn(`Failed to fetch briefs for cleanup: ${response.status()}`);
      return;
    }

    const data = await response.json();
    const briefs = data.data || [];

    // Filter briefs that match the test pattern
    const testBriefs = briefs.filter((brief: { header: string }) => brief.header.includes(headerPattern));

    if (testBriefs.length === 0) {
      console.log("No test briefs found to clean up");
      return;
    }

    console.log(`Found ${testBriefs.length} test brief(s) to clean up`);

    // Delete all test briefs
    const briefIds = testBriefs.map((brief: { id: string }) => brief.id);
    await deleteBriefs(page, briefIds);

    console.log(`Cleaned up ${briefIds.length} test brief(s)`);
  } catch (error) {
    console.error("Error during test briefs cleanup:", error);
  }
}

/**
 * Global cleanup function to be used in global teardown
 * Removes all test data created during the test run
 * @param page - Playwright page object
 */
export async function globalCleanup(page: Page): Promise<void> {
  console.log("Running global E2E test cleanup...");

  // Clean up test briefs
  await cleanupTestBriefs(page, "Test Brief");
  await cleanupTestBriefs(page, "E2E Test");
  await cleanupTestBriefs(page, "Accessibility Test");
  await cleanupTestBriefs(page, "Loading State Test");
  await cleanupTestBriefs(page, "Persistence Test");

  console.log("Global cleanup completed");
}

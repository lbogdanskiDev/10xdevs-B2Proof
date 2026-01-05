import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Brief List page
 * Represents the /briefs route where users can view and manage their briefs
 */
export class BriefListPage {
  readonly page: Page;
  readonly createBriefButton: Locator;
  readonly briefCards: Locator;
  readonly emptyState: Locator;
  readonly limitAlert: Locator;
  readonly filterOwnedTab: Locator;
  readonly filterSharedTab: Locator;
  readonly statusFilter: Locator;
  readonly paginationPrevious: Locator;
  readonly paginationNext: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header elements
    this.createBriefButton = page.locator('[data-test-id="create-brief-button"]');

    // Brief list elements
    this.briefCards = page.locator('[data-test-id^="brief-card-"]');
    this.emptyState = page.locator('text=No briefs');

    // Alert elements
    this.limitAlert = page.locator('text=Approaching brief limit');

    // Filter elements
    this.filterOwnedTab = page.locator('button[role="tab"]:has-text("My Briefs")');
    this.filterSharedTab = page.locator('button[role="tab"]:has-text("Shared with me")');
    this.statusFilter = page.locator('#status-filter');

    // Pagination elements
    this.paginationPrevious = page.locator('a:has-text("Previous")');
    this.paginationNext = page.locator('a:has-text("Next")');
  }

  /**
   * Navigate to the briefs list page
   */
  async goto() {
    await this.page.goto("/briefs");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Click the "Create Brief" button to navigate to the create brief form
   */
  async clickCreateBrief() {
    await this.createBriefButton.click();
    await this.page.waitForURL("**/briefs/new");
  }

  /**
   * Get a specific brief card by index (0-based)
   */
  getBriefCard(index: number): Locator {
    return this.briefCards.nth(index);
  }

  /**
   * Click on a brief card to navigate to its detail page
   */
  async clickBriefCard(index: number) {
    await this.getBriefCard(index).click();
    await this.page.waitForURL("**/briefs/*");
  }

  /**
   * Filter briefs by ownership (creator only)
   * @param filter - "owned" or "shared"
   */
  async filterByOwnership(filter: "owned" | "shared") {
    if (filter === "owned") {
      await this.filterOwnedTab.click();
    } else {
      await this.filterSharedTab.click();
    }
    await this.page.waitForURL((url) => url.searchParams.get("filter") === filter);
  }

  /**
   * Filter briefs by status
   * @param status - Status value (e.g., "draft", "in_review", "approved")
   */
  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.locator(`[role="option"]:has-text("${status}")`).click();
    await this.page.waitForURL((url) => url.searchParams.get("status") === status);
  }

  /**
   * Navigate to the next page of briefs
   */
  async goToNextPage() {
    await this.paginationNext.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to the previous page of briefs
   */
  async goToPreviousPage() {
    await this.paginationPrevious.click();
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Check if the create brief button is disabled (limit reached)
   */
  async isCreateBriefButtonDisabled(): Promise<boolean> {
    return await this.createBriefButton.isDisabled();
  }

  /**
   * Check if the limit warning alert is visible
   */
  async isLimitAlertVisible(): Promise<boolean> {
    return await this.limitAlert.isVisible();
  }

  /**
   * Check if the empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Get the count of brief cards displayed
   */
  async getBriefCount(): Promise<number> {
    return await this.briefCards.count();
  }
}

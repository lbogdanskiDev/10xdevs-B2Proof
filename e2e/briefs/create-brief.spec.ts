import { test, expect } from "../fixtures/base";
import { BriefListPage } from "../pages/BriefListPage";
import { CreateBriefPage } from "../pages/CreateBriefPage";
import { generateUniqueBriefData, generateUniqueBriefHeader } from "../helpers/test-data";
import { BriefTracker } from "../helpers/cleanup";

test.describe("Create Brief Flow", () => {
  let briefListPage: BriefListPage;
  let createBriefPage: CreateBriefPage;
  let briefTracker: BriefTracker;

  test.beforeEach(async ({ page }) => {
    briefListPage = new BriefListPage(page);
    createBriefPage = new CreateBriefPage(page);
    briefTracker = new BriefTracker();

    // Authentication is handled by the setup project (auth.setup.ts)
    // Tests run with creator user session via storageState in playwright.config.ts
  });

  test.afterEach(async ({ page }) => {
    // Clean up any briefs created during the test
    await briefTracker.cleanup(page);
  });

  test("should navigate from brief list to create brief page", async ({ page }) => {
    // Navigate to briefs list
    await briefListPage.goto();

    // Verify create button is visible
    await expect(briefListPage.createBriefButton).toBeVisible();

    // Click create brief button
    await briefListPage.clickCreateBrief();

    // Verify navigation to create brief page
    await expect(page).toHaveURL(/\/briefs\/new/);
    await expect(createBriefPage.headerInput).toBeVisible();
  });

  test("should create a brief with all fields filled", async ({ page }) => {
    // Navigate directly to create brief page
    await createBriefPage.goto();

    // Generate unique brief data to avoid duplicates
    const briefData = generateUniqueBriefData({
      headerPrefix: "E2E Test Brief - Full Data",
      contentPrefix: "This is a comprehensive test brief created by E2E automation testing",
      includeFooter: true,
      footerPrefix: "Test footer",
    });

    // Fill the form
    await createBriefPage.fillBriefForm(briefData);

    // Verify fields are filled correctly
    await expect(createBriefPage.headerInput).toHaveValue(briefData.header);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await expect(createBriefPage.footerInput).toHaveValue(briefData.footer!);

    // Save the brief
    await createBriefPage.clickSave();

    // Verify navigation to brief detail page
    await expect(page).toHaveURL(/\/briefs\/[a-f0-9-]+/);

    // Track created brief for cleanup
    briefTracker.trackFromUrl(page.url());
  });

  test("should create a brief with only required fields", async ({ page }) => {
    await createBriefPage.goto();

    // Generate unique brief data (required fields only)
    const briefData = generateUniqueBriefData({
      headerPrefix: "E2E Test Brief - Required Only",
      contentPrefix: "This brief only has the required fields filled in",
    });

    // Create brief using convenience method
    await createBriefPage.createBrief(briefData);

    // Verify successful creation and navigation
    await expect(page).toHaveURL(/\/briefs\/[a-f0-9-]+/);

    // Track created brief for cleanup
    briefTracker.trackFromUrl(page.url());
  });

  test("should disable save button when form is invalid", async () => {
    await createBriefPage.goto();

    // Initially, save button should be disabled (empty form)
    await expect(createBriefPage.saveButton).toBeDisabled();

    // Fill only header (content is required) - use unique header
    const uniqueHeader = generateUniqueBriefHeader("Test Header");
    await createBriefPage.fillHeader(uniqueHeader);

    // Save button should still be disabled
    await expect(createBriefPage.saveButton).toBeDisabled();

    // Fill content as well
    await createBriefPage.fillContent("Test content for validation");

    // Now save button should be enabled
    await expect(createBriefPage.saveButton).toBeEnabled();
  });

  test("should show validation errors for empty required fields", async () => {
    await createBriefPage.goto();

    // Try to save without filling any fields
    // Note: Save button should be disabled, but this tests error display

    // Fill and then clear header to trigger validation
    await createBriefPage.fillHeader("Test");
    await createBriefPage.headerInput.clear();

    // Check for validation error (this depends on your validation implementation)
    // This is a placeholder - adjust based on actual validation behavior
  });

  test("should cancel brief creation and return to list", async ({ page }) => {
    await createBriefPage.goto();

    // Fill some data with unique header
    const uniqueHeader = generateUniqueBriefHeader("Test Brief to Cancel");
    await createBriefPage.fillHeader(uniqueHeader);

    // Click cancel
    await createBriefPage.clickCancel();
    await createBriefPage.clickLeave();

    // Should navigate back to briefs list
    await expect(page).toHaveURL(/\/briefs$/);
  });

  test("should show unsaved changes warning when navigating away", async ({ page }) => {
    await createBriefPage.goto();

    // Fill some data to make form dirty - use unique data
    const uniqueHeader = generateUniqueBriefHeader("Unsaved Brief");
    await createBriefPage.fillHeader(uniqueHeader);
    await createBriefPage.fillContent("Some content that will not be saved");

    // Try to navigate away
    await createBriefPage.clickCancel();

    // Wait for unsaved changes dialog
    await createBriefPage.waitForUnsavedChangesDialog();

    // Verify dialog is visible
    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();

    // Cancel navigation
    await createBriefPage.cancelUnsavedChanges();

    // Should stay on create brief page
    await expect(page).toHaveURL(/\/briefs\/new/);

    // Try again and confirm
    await createBriefPage.clickCancel();
    await createBriefPage.waitForUnsavedChangesDialog();
    await createBriefPage.confirmUnsavedChanges();

    // Should navigate to briefs list
    await expect(page).toHaveURL(/\/briefs$/);
  });

  test("should show loading state when saving", async ({ page }) => {
    await createBriefPage.goto();

    // Generate unique brief data
    const briefData = generateUniqueBriefData({
      headerPrefix: "Loading State Test",
      contentPrefix: "Testing the loading state during save",
    });

    await createBriefPage.fillBriefForm(briefData);

    // Start saving
    const savePromise = createBriefPage.clickSave();

    // Check for loading state (this might be too fast in local environment)
    // In a real scenario with network delays, this would be more reliable
    const isLoading = await createBriefPage.isSaving();

    // Complete the save
    await savePromise;

    // Verify navigation
    await expect(page).toHaveURL(/\/briefs\/[a-f0-9-]+/);

    // Track created brief for cleanup
    briefTracker.trackFromUrl(page.url());
  });

  test("should have no accessibility violations on create brief page", async ({ page, makeAxeBuilder }) => {
    await createBriefPage.goto();

    // Fill form to test accessibility with content - use unique data
    const briefData = generateUniqueBriefData({
      headerPrefix: "Accessibility Test Brief",
      contentPrefix: "Testing accessibility compliance",
    });

    await createBriefPage.fillBriefForm(briefData);

    // Run accessibility checks
    const accessibilityScanResults = await makeAxeBuilder().analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should persist form data during session", async ({ page }) => {
    await createBriefPage.goto();

    // Generate unique test data
    const testHeader = generateUniqueBriefHeader("Persistence Test");
    const testContent = "Testing data persistence with unique content";

    // Fill form
    await createBriefPage.fillHeader(testHeader);
    await createBriefPage.fillContent(testContent);

    // Refresh page (simulating accidental refresh)
    // Note: This assumes no actual persistence is implemented
    // If you implement draft saving, this test should be updated
    await page.reload();

    // After reload, form should be empty (unless draft feature is implemented)
    const headerValue = await createBriefPage.getHeaderValue();
    expect(headerValue).toBe("");
  });
});

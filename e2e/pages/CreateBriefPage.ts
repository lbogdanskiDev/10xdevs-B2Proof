import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Create Brief page
 * Represents the /briefs/new route where users create new briefs
 */
export class CreateBriefPage {
  readonly page: Page;
  readonly headerInput: Locator;
  readonly contentEditor: Locator;
  readonly footerInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly leaveButton: Locator;
  readonly formElement: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form field elements
    this.headerInput = page.locator('[data-test-id="brief-header-input"]');
    this.contentEditor = page.locator('[data-test-id="brief-content-editor"]');
    this.footerInput = page.locator('[data-test-id="brief-footer-input"]');

    // Action buttons
    this.saveButton = page.locator('[data-test-id="save-brief-button"]');
    this.cancelButton = page.locator('[data-test-id="cancel-brief-button"]');
    this.leaveButton = page.locator('[data-test-id="leave-brief-creation-button"]');

    // Form and error elements
    this.formElement = page.locator("form");
    this.errorMessage = page.locator('[role="alert"]');
  }

  /**
   * Navigate to the create brief page
   */
  async goto() {
    await this.page.goto("/briefs/new");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill in the brief header field
   * @param header - The header text
   */
  async fillHeader(header: string) {
    await this.headerInput.fill(header);
  }

  /**
   * Fill in the brief content editor
   * @param content - The content text (plain text will be converted to rich text)
   */
  async fillContent(content: string) {
    // Click to focus the editor first
    await this.contentEditor.click();
    // Type the content
    await this.contentEditor.fill(content);
  }

  /**
   * Fill in the brief footer field (optional)
   * @param footer - The footer text
   */
  async fillFooter(footer: string) {
    await this.footerInput.fill(footer);
  }

  /**
   * Fill the entire brief form with provided data
   * @param data - Brief form data
   */
  async fillBriefForm(data: { header: string; content: string; footer?: string }) {
    await this.fillHeader(data.header);
    await this.fillContent(data.content);

    if (data.footer) {
      await this.fillFooter(data.footer);
    }
  }

  /**
   * Click the save button to submit the form
   * Waits for navigation to the brief detail page
   */
  async clickSave() {
    await this.saveButton.click();
    // Wait for redirect to brief detail page after successful creation
    await this.page.waitForURL("**/briefs/*", { waitUntil: "networkidle" });
  }

  /**
   * Click the cancel button
   * Waits for navigation back to briefs list
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Click the leave button
   * Waits for navigation back to briefs list
   */
  async clickLeave() {
    await this.leaveButton.click();
  }

  /**
   * Create a new brief with the provided data
   * This is a convenience method that fills the form and saves it
   * @param data - Brief form data
   */
  async createBrief(data: { header: string; content: string; footer?: string }) {
    await this.fillBriefForm(data);
    await this.clickSave();
  }

  /**
   * Check if the save button is disabled
   * (e.g., when form is invalid or saving is in progress)
   */
  async isSaveButtonDisabled(): Promise<boolean> {
    return await this.saveButton.isDisabled();
  }

  /**
   * Check if the cancel button is disabled
   * (e.g., when form is saving)
   */
  async isCancelButtonDisabled(): Promise<boolean> {
    return await this.cancelButton.isDisabled();
  }

  /**
   * Check if the save button shows loading state
   */
  async isSaving(): Promise<boolean> {
    const loader = this.saveButton.locator("svg.animate-spin");
    return await loader.isVisible();
  }

  /**
   * Get the current value of the header field
   */
  async getHeaderValue(): Promise<string> {
    return await this.headerInput.inputValue();
  }

  /**
   * Get the current value of the footer field
   */
  async getFooterValue(): Promise<string> {
    return await this.footerInput.inputValue();
  }

  /**
   * Get the current content text from the editor
   */
  async getContentText(): Promise<string> {
    return (await this.contentEditor.textContent()) || "";
  }

  /**
   * Check if an error message is visible
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get the error message text (if visible)
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasErrorMessage()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if the header field has a validation error
   */
  async hasHeaderError(): Promise<boolean> {
    const errorElement = this.page.locator('p.text-destructive:near([data-test-id="brief-header-input"])');
    return await errorElement.isVisible();
  }

  /**
   * Check if the content editor has a validation error
   */
  async hasContentError(): Promise<boolean> {
    const errorElement = this.page.locator('p.text-destructive:near([data-test-id="brief-content-editor"])');
    return await errorElement.isVisible();
  }

  /**
   * Check if the footer field has a validation error
   */
  async hasFooterError(): Promise<boolean> {
    const errorElement = this.page.locator('p.text-destructive:near([data-test-id="brief-footer-input"])');
    return await errorElement.isVisible();
  }

  /**
   * Wait for the unsaved changes dialog to appear
   * (shown when navigating away with unsaved changes)
   */
  async waitForUnsavedChangesDialog() {
    await this.page.locator('[role="alertdialog"]').waitFor({ state: "visible" });
  }

  /**
   * Confirm navigation in the unsaved changes dialog
   */
  async confirmUnsavedChanges() {
    await this.page.locator('[role="alertdialog"] button:has-text("Leave")').click();
  }

  /**
   * Cancel navigation in the unsaved changes dialog
   */
  async cancelUnsavedChanges() {
    await this.page.locator('[role="alertdialog"] button:has-text("Stay")').click();
  }
}

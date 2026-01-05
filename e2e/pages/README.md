# Page Object Model (POM) Documentation

This directory contains Page Object Model classes for E2E testing with Playwright.

## Overview

Page Object Model is a design pattern that creates an object-oriented representation of web pages and components. Each page class encapsulates the structure and behavior of a specific page, making tests more maintainable and readable.

## Benefits

- **Maintainability**: Changes to page structure require updates in only one place
- **Reusability**: Page objects can be used across multiple test files
- **Readability**: Tests read like user stories rather than technical DOM queries
- **Type Safety**: TypeScript provides autocomplete and type checking
- **Resilience**: Locators are centralized, making tests less brittle

## Structure

```
e2e/
├── pages/
│   ├── BriefListPage.ts      # Brief list page (/briefs)
│   ├── CreateBriefPage.ts    # Create brief page (/briefs/new)
│   └── README.md             # This file
├── fixtures/
│   └── base.ts               # Test fixtures and setup
└── briefs/
    └── create-brief.spec.ts  # E2E tests for brief creation
```

## Usage Example

### Basic Usage

```typescript
import { test, expect } from "../fixtures/base";
import { BriefListPage } from "../pages/BriefListPage";
import { CreateBriefPage } from "../pages/CreateBriefPage";

test("should create a new brief", async ({ page }) => {
  const briefListPage = new BriefListPage(page);
  const createBriefPage = new CreateBriefPage(page);

  // Navigate to briefs list
  await briefListPage.goto();

  // Click create brief button
  await briefListPage.clickCreateBrief();

  // Fill and submit the form
  await createBriefPage.createBrief({
    header: "Test Brief",
    content: "This is a test brief",
  });

  // Verify successful creation
  await expect(page).toHaveURL(/\/briefs\/[a-f0-9-]+/);
});
```

### Advanced Usage with Assertions

```typescript
test("should validate form fields", async ({ page }) => {
  const createBriefPage = new CreateBriefPage(page);

  await createBriefPage.goto();

  // Initially, save should be disabled
  expect(await createBriefPage.isSaveButtonDisabled()).toBe(true);

  // Fill required fields
  await createBriefPage.fillHeader("Test");
  await createBriefPage.fillContent("Content");

  // Now save should be enabled
  expect(await createBriefPage.isSaveButtonDisabled()).toBe(false);

  // Verify field values
  expect(await createBriefPage.getHeaderValue()).toBe("Test");
});
```

## Page Object Classes

### BriefListPage

Represents the `/briefs` route where users view and manage their briefs.

**Key Methods:**

- `goto()` - Navigate to briefs list
- `clickCreateBrief()` - Click create brief button
- `clickBriefCard(index)` - Click on a specific brief card
- `filterByOwnership(filter)` - Filter by owned/shared
- `filterByStatus(status)` - Filter by status
- `getBriefCount()` - Get number of briefs displayed

**Locators:**

- `createBriefButton` - Create brief button
- `briefCards` - All brief cards
- `emptyState` - Empty state message
- `limitAlert` - Limit warning alert
- `filterOwnedTab`, `filterSharedTab` - Filter tabs
- `statusFilter` - Status dropdown
- `paginationPrevious`, `paginationNext` - Pagination controls

### CreateBriefPage

Represents the `/briefs/new` route where users create new briefs.

**Key Methods:**

- `goto()` - Navigate to create brief page
- `fillHeader(header)` - Fill header field
- `fillContent(content)` - Fill content editor
- `fillFooter(footer)` - Fill footer field (optional)
- `fillBriefForm(data)` - Fill entire form at once
- `clickSave()` - Save the brief
- `clickCancel()` - Cancel creation
- `createBrief(data)` - Convenience method to fill and save
- `isSaveButtonDisabled()` - Check if save is disabled
- `isSaving()` - Check if form is currently saving
- `getHeaderValue()` - Get current header value
- `hasErrorMessage()` - Check for validation errors

**Locators:**

- `headerInput` - Header input field
- `contentEditor` - TipTap content editor
- `footerInput` - Footer textarea
- `saveButton` - Save button
- `cancelButton` - Cancel button
- `errorMessage` - Error message elements

## Best Practices

### 1. Use Semantic Method Names

```typescript
// Good
await briefListPage.clickCreateBrief();

// Bad
await page.click('[data-test-id="create-brief-button"]');
```

### 2. Return Meaningful Values

```typescript
// Methods should return useful data
const briefCount = await briefListPage.getBriefCount();
expect(briefCount).toBeGreaterThan(0);
```

### 3. Handle Waiting in Page Objects

```typescript
// Page object handles waiting
async clickCreateBrief() {
  await this.createBriefButton.click();
  await this.page.waitForURL("**/briefs/new");
}
```

### 4. Use Test-Specific Data Attributes

All interactive elements use `data-test-id` attributes for reliable selection:

```typescript
this.headerInput = page.locator('[data-test-id="brief-header-input"]');
```

### 5. Leverage TypeScript

```typescript
// Type-safe method parameters
async filterByOwnership(filter: "owned" | "shared") {
  // Implementation
}
```

### 6. Implement Convenience Methods

```typescript
// High-level method for common workflows
async createBrief(data: { header: string; content: string; footer?: string }) {
  await this.fillBriefForm(data);
  await this.clickSave();
}
```

## Testing Guidelines

### Setup and Teardown

Use `beforeEach` to initialize page objects:

```typescript
test.describe("Brief Creation", () => {
  let createBriefPage: CreateBriefPage;

  test.beforeEach(async ({ page }) => {
    createBriefPage = new CreateBriefPage(page);
    // Add authentication setup here
  });

  test("should create brief", async () => {
    await createBriefPage.goto();
    // Test implementation
  });
});
```

### Assertions

Use Playwright's built-in assertions with page object methods:

```typescript
// Element visibility
await expect(createBriefPage.saveButton).toBeVisible();

// Element state
await expect(createBriefPage.saveButton).toBeDisabled();

// Custom assertions using page object methods
expect(await createBriefPage.getBriefCount()).toBe(5);
```

### Accessibility Testing

Combine POM with accessibility testing:

```typescript
test("should have no accessibility violations", async ({ page, makeAxeBuilder }) => {
  await createBriefPage.goto();
  await createBriefPage.fillBriefForm({ header: "Test", content: "Test" });

  const accessibilityScanResults = await makeAxeBuilder().analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Adding New Page Objects

When creating a new page object:

1. Create a new file in `e2e/pages/` (e.g., `BriefDetailPage.ts`)
2. Import required types: `import type { Page, Locator } from "@playwright/test"`
3. Create a class with constructor accepting `Page`
4. Define locators as readonly properties
5. Implement navigation and interaction methods
6. Export the class
7. Update this README with documentation

Example structure:

```typescript
import type { Page, Locator } from "@playwright/test";

export class MyPage {
  readonly page: Page;
  readonly myElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myElement = page.locator('[data-test-id="my-element"]');
  }

  async goto() {
    await this.page.goto("/my-route");
    await this.page.waitForLoadState("networkidle");
  }

  async performAction() {
    await this.myElement.click();
  }
}
```

## Test Data Management

### Generating Unique Test Data

All tests use unique data generation to prevent duplicates and test pollution:

```typescript
import { generateUniqueBriefData, generateUniqueBriefHeader } from "../helpers/test-data";

// Generate complete unique brief data
const briefData = generateUniqueBriefData({
  headerPrefix: "My Test Brief",
  contentPrefix: "Test content",
  includeFooter: true,
});

// Generate just a unique header
const header = generateUniqueBriefHeader("Test Brief");
```

**Key Features:**

- Timestamp-based unique IDs (format: `YYYYMMDD_HHmmss_randomHash`)
- Customizable prefixes for different test scenarios
- Optional footer generation
- Multiple briefs generation for batch tests

### Cleaning Up Test Data

Use `BriefTracker` to automatically clean up created briefs:

```typescript
import { BriefTracker } from "../helpers/cleanup";

test.describe("My Tests", () => {
  let briefTracker: BriefTracker;

  test.beforeEach(() => {
    briefTracker = new BriefTracker();
  });

  test.afterEach(async ({ page }) => {
    // Automatically deletes all tracked briefs
    await briefTracker.cleanup(page);
  });

  test("should create brief", async ({ page }) => {
    // ... create brief ...

    // Track for cleanup (extracts ID from URL automatically)
    briefTracker.trackFromUrl(page.url());
  });
});
```

**Benefits:**

- Prevents test data pollution
- Ensures clean state between test runs
- Automatic ID extraction from URLs
- Batch deletion support

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/briefs/create-brief.spec.ts

# Run tests in UI mode
npx playwright test --ui

# Run tests in debug mode
npx playwright test --debug

# Generate test code
npx playwright codegen http://localhost:3000
```

## Debugging

### Use Playwright Inspector

```bash
npx playwright test --debug
```

### View Test Traces

```bash
npx playwright show-report
```

### Use Console Logging

```typescript
test("debug test", async ({ page }) => {
  const briefListPage = new BriefListPage(page);
  await briefListPage.goto();

  const count = await briefListPage.getBriefCount();
  console.log(`Found ${count} briefs`);
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locator Strategies](https://playwright.dev/docs/locators)

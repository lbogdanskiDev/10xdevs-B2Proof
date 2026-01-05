# Testing Guide - B2Proof

This document provides guidance on testing strategies and best practices for the B2Proof project.

## Table of Contents

- [Overview](#overview)
- [Unit & Integration Testing (Vitest)](#unit--integration-testing-vitest)
- [End-to-End Testing (Playwright)](#end-to-end-testing-playwright)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)

## Overview

B2Proof uses a comprehensive testing strategy with:

- **Vitest** for unit and integration tests
- **@testing-library/react** for component testing
- **Playwright** for end-to-end (E2E) testing
- **MSW (Mock Service Worker)** for API mocking
- **axe-core** for accessibility testing

### Coverage Targets

| Metric                     | Target                          |
| -------------------------- | ------------------------------- |
| Unit Test Coverage         | ≥80% for services and utilities |
| Integration Test Coverage  | 100% of API endpoints           |
| Critical Path E2E Coverage | 100% of user stories            |

## Unit & Integration Testing (Vitest)

### Configuration

Vitest is configured in [vitest.config.ts](../vitest.config.ts) with:

- **Vitest 4.x** with `vmThreads` pool for Windows compatibility
- **jsdom** environment for DOM testing
- **c8** coverage provider
- **globals: true** for convenient test API access
- **isolate: true** for test isolation
- Path aliases (`@/`) matching the project structure
- Global test utilities from setup file

**Important:** The `vmThreads` pool configuration is critical for stable test execution on Windows with ESM modules.

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';

describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { /* ... */ };

    // Act
    render(<ComponentName {...props} />);

    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Key Guidelines

1. **Use `vi` object for mocks**

   ```typescript
   const mockFn = vi.fn();
   vi.spyOn(module, "method");
   vi.stubGlobal("fetch", mockFetch);
   ```

2. **Place mock factories at top level**

   ```typescript
   vi.mock("@/lib/services/auth", () => ({
     login: vi.fn(),
     logout: vi.fn(),
   }));
   ```

3. **Use custom render from test-utils**

   ```typescript
   import { render, screen } from "@/test/utils/test-utils";
   ```

4. **Follow Arrange-Act-Assert pattern**

   ```typescript
   // Arrange - Set up test data
   const user = { name: 'John' };

   // Act - Perform action
   render(<Profile user={user} />);

   // Assert - Verify result
   expect(screen.getByText('John')).toBeInTheDocument();
   ```

### Mocking API Calls

Use MSW for network request mocking:

```typescript
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";

// In your test
server.use(
  http.get("/api/users", () => {
    return HttpResponse.json([{ id: 1, name: "John" }]);
  })
);
```

## End-to-End Testing (Playwright)

### Configuration

Playwright is configured in [playwright.config.ts](../playwright.config.ts) with:

- **Chromium** browser only (as per project requirements)
- Desktop Chrome viewport
- Automatic dev server startup
- Trace collection on first retry
- Screenshots and videos on failure

### Test Structure

```typescript
import { test, expect } from "./fixtures/base";

test.describe("Feature Name", () => {
  test("should perform user action", async ({ page }) => {
    // Navigate to page
    await page.goto("/feature");

    // Interact with page
    await page.getByRole("button", { name: "Submit" }).click();

    // Assert outcome
    await expect(page.getByText("Success")).toBeVisible();
  });
});
```

### Page Object Model

For complex pages, use Page Object Model:

```typescript
// e2e/pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Login" }).click();
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL("/dashboard");
  }
}

// In test
const loginPage = new LoginPage(page);
await loginPage.login("test@example.com", "password");
await loginPage.expectLoginSuccess();
```

### Accessibility Testing

Use the extended test fixture for accessibility checks:

```typescript
import { test, expect } from "./fixtures/base";

test("should have no accessibility violations", async ({ page, makeAxeBuilder }) => {
  await page.goto("/");

  const results = await makeAxeBuilder().analyze();

  expect(results.violations).toEqual([]);
});
```

### Key Guidelines

1. **Use semantic locators**

   ```typescript
   // Good
   page.getByRole("button", { name: "Submit" });
   page.getByLabel("Email");
   page.getByText("Welcome");

   // Avoid
   page.locator("#submit-btn");
   page.locator(".email-input");
   ```

2. **Wait for elements automatically**

   ```typescript
   // Playwright auto-waits
   await page.getByRole("button").click();

   // Manual wait only when needed
   await page.waitForLoadState("networkidle");
   ```

3. **Use test hooks for setup/teardown**

   ```typescript
   test.beforeEach(async ({ page }) => {
     await page.goto("/");
   });

   test.afterEach(async ({ page }) => {
     // Cleanup
   });
   ```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run with UI
npm run test:ui

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### All Tests

```bash
# Run both unit and E2E tests
npm run test:all
```

## Writing Tests

### Unit Test Example

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });
});
```

### Component Test Example

```typescript
// src/components/ui/button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { Button } from './button';

describe('Button', () => {
  it('should handle onClick events', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from "../fixtures/base";

test.describe("Login", () => {
  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome")).toBeVisible();
  });
});
```

## Coverage

### Viewing Coverage Reports

After running `npm run test:coverage`, open the HTML report:

```bash
# Coverage reports are generated in ./coverage/
# Open coverage/index.html in your browser
```

### Coverage Configuration

Coverage thresholds are configured in [vitest.config.ts](../vitest.config.ts):

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Excluded from Coverage

- `node_modules/`
- `src/test/` (test utilities)
- `**/*.d.ts` (type definitions)
- `**/*.config.*` (configuration files)
- `src/app/**` (Next.js app directory - tested via E2E)

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good - tests user behavior
it('should show error when email is invalid', async () => {
  const { user } = render(<LoginForm />);

  await user.type(screen.getByLabel('Email'), 'invalid');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(screen.getByText('Invalid email')).toBeVisible();
});

// Bad - tests implementation details
it('should call validateEmail function', () => {
  const spy = vi.spyOn(validator, 'validateEmail');
  render(<LoginForm />);
  expect(spy).toHaveBeenCalled();
});
```

### 2. Use Accessible Queries

```typescript
// Priority order (from highest to lowest):
screen.getByRole("button", { name: "Submit" });
screen.getByLabelText("Email");
screen.getByPlaceholderText("Enter email");
screen.getByText("Welcome");
screen.getByDisplayValue("current value");
screen.getByAltText("Profile picture");
screen.getByTitle("Close");

// Avoid:
screen.getByTestId("submit-btn"); // Only as last resort
```

### 3. Write Maintainable Tests

- Keep tests simple and focused
- One assertion per test when possible
- Use descriptive test names
- Group related tests in `describe` blocks
- Extract common setup to `beforeEach`

### 4. Handle Async Operations

```typescript
// Component tests
it('should load data', async () => {
  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});

// E2E tests (auto-waits)
test('should submit form', async ({ page }) => {
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

## Troubleshooting

### Common Issues

1. **Tests fail with "element not found"**
   - Use `screen.debug()` to see DOM
   - Check if element is rendered conditionally
   - Use `waitFor` for async content

2. **Coverage not reaching threshold**
   - Identify uncovered code with HTML report
   - Focus on critical paths first
   - Exclude non-critical files if needed

3. **E2E tests timeout**
   - Increase timeout in test: `test.setTimeout(60000)`
   - Check if dev server is running
   - Use `page.pause()` to debug

4. **Mock not working**
   - Ensure mock is defined before import
   - Check mock factory returns correct structure
   - Clear mocks between tests: `vi.clearAllMocks()`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)

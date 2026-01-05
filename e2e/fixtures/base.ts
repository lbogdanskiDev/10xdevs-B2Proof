import { test as base } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Extended Playwright test with accessibility testing
 */
export const test = base.extend<{
  makeAxeBuilder: () => AxeBuilder;
}>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(makeAxeBuilder);
  },
});

export { expect } from "@playwright/test";

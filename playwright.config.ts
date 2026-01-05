import path from "path";
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Storage state file paths for authenticated sessions
 * These files are created by auth.setup.ts and reused by test projects
 */
const AUTH_FILE = {
  creator: "e2e/.auth/creator.json",
  client: "e2e/.auth/client.json",
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html"], ["list"], ["json", { outputFile: "playwright-report/results.json" }]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers - Using only Chromium as per requirements */
  projects: [
    /**
     * Setup project - authenticates test users and saves session state
     * Runs before all other projects that depend on it
     */
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    /**
     * Unauthenticated tests - for login page, public pages, etc.
     * Runs WITHOUT storageState (no authentication)
     * Tests in e2e/auth/ folder are unauthenticated by design
     */
    {
      name: "chromium-unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /e2e\/auth\/.*\.spec\.ts/,
    },

    /**
     * Main test project - uses creator authentication by default
     * Most tests (creating briefs, managing content) require creator role
     */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE.creator,
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /e2e\/auth\/.*/],
    },

    /**
     * Client role tests - for testing recipient/client-specific features
     * Only runs tests matching *.client.spec.ts pattern
     */
    {
      name: "chromium-client",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE.client,
      },
      dependencies: ["setup"],
      testMatch: /.*\.client\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

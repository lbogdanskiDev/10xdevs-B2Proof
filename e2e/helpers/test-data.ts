/**
 * Test data generation helpers
 * Provides utilities for generating unique test data to avoid duplicates
 */

/**
 * Generate a unique timestamp-based identifier
 * Format: YYYYMMDD_HHmmss_randomHash
 */
export function generateUniqueId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, "").slice(0, 15);
  const randomHash = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${randomHash}`;
}

/**
 * Generate a unique brief header with timestamp
 * @param prefix - Optional prefix for the header (default: "Test Brief")
 */
export function generateUniqueBriefHeader(prefix = "Test Brief"): string {
  const uniqueId = generateUniqueId();
  return `${prefix} - ${uniqueId}`;
}

/**
 * Generate unique brief data for testing
 * @param options - Optional customization options
 */
export function generateUniqueBriefData(options?: {
  headerPrefix?: string;
  contentPrefix?: string;
  includeFooter?: boolean;
  footerPrefix?: string;
}): {
  header: string;
  content: string;
  footer?: string;
} {
  const uniqueId = generateUniqueId();

  const header = options?.headerPrefix
    ? `${options.headerPrefix} - ${uniqueId}`
    : `Test Brief - ${uniqueId}`;

  const content = options?.contentPrefix
    ? `${options.contentPrefix} - Created at ${new Date().toISOString()}`
    : `This is an automated test brief created at ${new Date().toISOString()} with unique ID: ${uniqueId}`;

  const data: { header: string; content: string; footer?: string } = {
    header,
    content,
  };

  if (options?.includeFooter) {
    data.footer = options?.footerPrefix
      ? `${options.footerPrefix} - ${uniqueId}`
      : `Test footer - ${uniqueId}`;
  }

  return data;
}

/**
 * Generate multiple unique brief data sets
 * Useful for tests that need to create multiple briefs
 * @param count - Number of brief data sets to generate
 * @param options - Optional customization options
 */
export function generateMultipleUniqueBriefs(
  count: number,
  options?: Parameters<typeof generateUniqueBriefData>[0]
): Array<{ header: string; content: string; footer?: string }> {
  return Array.from({ length: count }, (_, index) =>
    generateUniqueBriefData({
      ...options,
      headerPrefix: options?.headerPrefix ? `${options.headerPrefix} ${index + 1}` : `Test Brief ${index + 1}`,
    })
  );
}

/**
 * Generate a unique email address for testing
 * @param prefix - Optional prefix (default: "test")
 */
export function generateUniqueEmail(prefix = "test"): string {
  const uniqueId = generateUniqueId();
  return `${prefix}_${uniqueId}@example.com`;
}

/**
 * Generate a unique username for testing
 * @param prefix - Optional prefix (default: "user")
 */
export function generateUniqueUsername(prefix = "user"): string {
  const uniqueId = generateUniqueId();
  return `${prefix}_${uniqueId}`;
}

/**
 * Wait for a random duration to avoid race conditions
 * @param minMs - Minimum wait time in milliseconds
 * @param maxMs - Maximum wait time in milliseconds
 */
export async function randomWait(minMs = 100, maxMs = 500): Promise<void> {
  const waitTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, waitTime));
}

/**
 * Test data constants
 */
export const TEST_DATA = {
  BRIEF: {
    MIN_HEADER_LENGTH: 1,
    MAX_HEADER_LENGTH: 200,
    MIN_CONTENT_LENGTH: 1,
    MAX_CONTENT_LENGTH: 10000,
    MAX_FOOTER_LENGTH: 500,
  },
  DELAYS: {
    SHORT: 100,
    MEDIUM: 500,
    LONG: 1000,
  },
} as const;

/**
 * Validate brief data against expected constraints
 * Useful for testing validation logic
 */
export function validateBriefData(data: {
  header: string;
  content: string;
  footer?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.header || data.header.length < TEST_DATA.BRIEF.MIN_HEADER_LENGTH) {
    errors.push("Header is required");
  }

  if (data.header && data.header.length > TEST_DATA.BRIEF.MAX_HEADER_LENGTH) {
    errors.push(`Header exceeds maximum length of ${TEST_DATA.BRIEF.MAX_HEADER_LENGTH} characters`);
  }

  if (!data.content || data.content.length < TEST_DATA.BRIEF.MIN_CONTENT_LENGTH) {
    errors.push("Content is required");
  }

  if (data.content && data.content.length > TEST_DATA.BRIEF.MAX_CONTENT_LENGTH) {
    errors.push(`Content exceeds maximum length of ${TEST_DATA.BRIEF.MAX_CONTENT_LENGTH} characters`);
  }

  if (data.footer && data.footer.length > TEST_DATA.BRIEF.MAX_FOOTER_LENGTH) {
    errors.push(`Footer exceeds maximum length of ${TEST_DATA.BRIEF.MAX_FOOTER_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

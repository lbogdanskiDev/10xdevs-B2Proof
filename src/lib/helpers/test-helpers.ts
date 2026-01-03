import { vi, type Mock } from "vitest";

/**
 * Test Helpers for Service Layer Tests
 *
 * This file contains reusable helper functions and factories for testing services.
 * Import these helpers in your test files to reduce boilerplate and maintain consistency.
 */

// ============================================================================
// MOCK CHAIN BUILDERS
// ============================================================================

/**
 * Creates a mock Supabase query chain with customizable method overrides
 *
 * @example
 * const chain = createMockFromChain({
 *   single: vi.fn().mockResolvedValue({ data: mockData, error: null })
 * });
 */
export const createMockFromChain = (
  overrides: {
    select?: Mock;
    insert?: Mock;
    update?: Mock;
    delete?: Mock;
    eq?: Mock;
    in?: Mock;
    or?: Mock;
    is?: Mock;
    order?: Mock;
    range?: Mock;
    single?: Mock;
  } = {}
) => ({
  select: overrides.select ?? vi.fn().mockReturnThis(),
  insert: overrides.insert ?? vi.fn().mockReturnThis(),
  update: overrides.update ?? vi.fn().mockReturnThis(),
  delete: overrides.delete ?? vi.fn().mockReturnThis(),
  eq: overrides.eq ?? vi.fn().mockReturnThis(),
  in: overrides.in ?? vi.fn().mockReturnThis(),
  or: overrides.or ?? vi.fn().mockReturnThis(),
  is: overrides.is ?? vi.fn().mockReturnThis(),
  order: overrides.order ?? vi.fn().mockReturnThis(),
  range: overrides.range ?? vi.fn().mockReturnThis(),
  single: overrides.single ?? vi.fn(),
});

// ============================================================================
// CONSOLE UTILITIES
// ============================================================================

/**
 * Suppresses console output during tests
 *
 * @example
 * const spy = suppressConsole("error");
 * // ... test code ...
 * spy.mockRestore();
 */
export const suppressConsole = (method: "log" | "error" | "warn" | "info") => {
  const spy = vi.spyOn(console, method).mockImplementation(() => undefined);
  return spy;
};

// ============================================================================
// USER & PROFILE FACTORIES
// ============================================================================

/**
 * Creates a mock user object for authentication tests
 */
export const createMockUser = (
  overrides: {
    id?: string;
    email?: string | null;
  } = {}
) => ({
  id: overrides.id ?? "user-123",
  email: overrides.email !== undefined ? overrides.email : "test@example.com",
});

/**
 * Creates a mock profile object
 */
export const createMockProfile = (
  overrides: {
    id?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
  } = {}
) => ({
  id: overrides.id ?? "user-123",
  role: overrides.role ?? "creator",
  created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
  updated_at: overrides.updated_at ?? "2024-01-01T00:00:00Z",
});

// ============================================================================
// COMMENT FACTORIES
// ============================================================================

/**
 * Creates a mock comment database object
 */
export const createMockComment = (
  overrides: {
    id?: string;
    brief_id?: string;
    author_id?: string;
    content?: string;
    created_at?: string;
  } = {}
) => ({
  id: overrides.id ?? "comment-123",
  brief_id: overrides.brief_id ?? "brief-123",
  author_id: overrides.author_id ?? "author-123",
  content: overrides.content ?? "Test comment content",
  created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
});

/**
 * Creates a mock author info object
 */
export const createMockAuthorInfo = (
  overrides: {
    email?: string;
    role?: "client" | "creator";
  } = {}
) => ({
  email: overrides.email ?? "author@example.com",
  role: overrides.role ?? ("client" as const),
});

/**
 * Creates a mock comment DTO (Data Transfer Object)
 */
export const createMockCommentDto = (
  overrides: {
    id?: string;
    briefId?: string;
    authorId?: string;
    authorEmail?: string;
    authorRole?: string;
    content?: string;
    isOwn?: boolean;
    createdAt?: string;
  } = {}
) => ({
  id: overrides.id ?? "comment-123",
  briefId: overrides.briefId ?? "brief-123",
  authorId: overrides.authorId ?? "author-123",
  authorEmail: overrides.authorEmail ?? "author@example.com",
  authorRole: overrides.authorRole ?? "client",
  content: overrides.content ?? "Test comment content",
  isOwn: overrides.isOwn ?? true,
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00Z",
});

// ============================================================================
// BRIEF FACTORIES
// ============================================================================

/**
 * Creates a mock brief entity object (database representation)
 */
export const createMockBrief = (
  overrides: {
    id?: string;
    owner_id?: string;
    header?: string;
    content?: string;
    footer?: string | null;
    status?: "draft" | "sent" | "accepted" | "needs_modification";
    status_changed_at?: string | null;
    status_changed_by?: string | null;
    comment_count?: number;
    created_at?: string;
    updated_at?: string;
  } = {}
) => ({
  id: overrides.id ?? "brief-123",
  owner_id: overrides.owner_id ?? "user-123",
  header: overrides.header ?? "Test Brief Header",
  content: overrides.content ?? "Test brief content",
  footer: overrides.footer !== undefined ? overrides.footer : "Test footer",
  status: overrides.status ?? ("draft" as const),
  status_changed_at: overrides.status_changed_at !== undefined ? overrides.status_changed_at : null,
  status_changed_by: overrides.status_changed_by !== undefined ? overrides.status_changed_by : null,
  comment_count: overrides.comment_count ?? 0,
  created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
  updated_at: overrides.updated_at ?? "2024-01-01T00:00:00Z",
});

/**
 * Creates a mock brief list item DTO
 */
export const createMockBriefListItemDto = (
  overrides: {
    id?: string;
    header?: string;
    status?: "draft" | "sent" | "accepted" | "needs_modification";
    statusChangedAt?: string | null;
    statusChangedBy?: string | null;
    commentCount?: number;
    isOwned?: boolean;
    createdAt?: string;
    updatedAt?: string;
  } = {}
) => ({
  id: overrides.id ?? "brief-123",
  header: overrides.header ?? "Test Brief Header",
  status: overrides.status ?? ("draft" as const),
  statusChangedAt: overrides.statusChangedAt !== undefined ? overrides.statusChangedAt : null,
  statusChangedBy: overrides.statusChangedBy !== undefined ? overrides.statusChangedBy : null,
  commentCount: overrides.commentCount ?? 0,
  isOwned: overrides.isOwned ?? true,
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00Z",
});

/**
 * Creates a mock brief detail DTO
 */
export const createMockBriefDetailDto = (
  overrides: {
    id?: string;
    header?: string;
    content?: string;
    footer?: string | null;
    status?: "draft" | "sent" | "accepted" | "needs_modification";
    statusChangedAt?: string | null;
    statusChangedBy?: string | null;
    commentCount?: number;
    isOwned?: boolean;
    createdAt?: string;
    updatedAt?: string;
  } = {}
) => ({
  id: overrides.id ?? "brief-123",
  header: overrides.header ?? "Test Brief Header",
  content: overrides.content ?? "Test brief content",
  footer: overrides.footer !== undefined ? overrides.footer : "Test footer",
  status: overrides.status ?? ("draft" as const),
  statusChangedAt: overrides.statusChangedAt !== undefined ? overrides.statusChangedAt : null,
  statusChangedBy: overrides.statusChangedBy !== undefined ? overrides.statusChangedBy : null,
  commentCount: overrides.commentCount ?? 0,
  isOwned: overrides.isOwned ?? true,
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00Z",
});

// ============================================================================
// RECIPIENT FACTORIES
// ============================================================================

/**
 * Creates a mock recipient entity object
 */
export const createMockRecipient = (
  overrides: {
    id?: string;
    brief_id?: string;
    recipient_id?: string | null;
    recipient_email?: string;
    shared_by?: string;
    shared_at?: string;
  } = {}
) => ({
  id: overrides.id ?? "recipient-123",
  brief_id: overrides.brief_id ?? "brief-123",
  recipient_id: overrides.recipient_id !== undefined ? overrides.recipient_id : "user-456",
  recipient_email: overrides.recipient_email ?? "recipient@example.com",
  shared_by: overrides.shared_by ?? "user-123",
  shared_at: overrides.shared_at ?? "2024-01-01T00:00:00Z",
});

/**
 * Creates a mock recipient DTO
 */
export const createMockRecipientDto = (
  overrides: {
    id?: string;
    briefId?: string;
    recipientId?: string;
    recipientEmail?: string;
    sharedBy?: string;
    sharedAt?: string;
  } = {}
) => ({
  id: overrides.id ?? "recipient-123",
  briefId: overrides.briefId ?? "brief-123",
  recipientId: overrides.recipientId ?? "user-456",
  recipientEmail: overrides.recipientEmail ?? "recipient@example.com",
  sharedBy: overrides.sharedBy ?? "user-123",
  sharedAt: overrides.sharedAt ?? "2024-01-01T00:00:00Z",
});

// ============================================================================
// PAGINATION FACTORIES
// ============================================================================

/**
 * Creates a mock pagination object
 */
export const createMockPagination = (
  overrides: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  } = {}
) => ({
  page: overrides.page ?? 1,
  limit: overrides.limit ?? 10,
  total: overrides.total ?? 50,
  totalPages: overrides.totalPages ?? 5,
});

// ============================================================================
// RESPONSE FACTORIES
// ============================================================================

/**
 * Creates a successful Supabase response
 */
export const createSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
});

/**
 * Creates an error Supabase response
 */
export const createErrorResponse = (message: string) => ({
  data: null,
  error: { message },
});

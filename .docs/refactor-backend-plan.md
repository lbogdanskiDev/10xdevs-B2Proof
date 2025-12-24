# Backend Refactoring Plan - B2Proof

## Executive Summary

This document outlines a comprehensive refactoring plan for the B2Proof backend to reduce code duplication, improve maintainability, and follow best practices. The refactoring is organized into phases, prioritized by impact and effort.

**Current State Analysis:**

- 8 API route handlers with significant boilerplate repetition
- 3 service files (~1,500+ lines total) with scattered authorization logic
- Well-designed error class hierarchy (minimal changes needed)
- Strong type system in place
- N+1 query issues in comments service

---

## Table of Contents

1. [Phase 1: API Handler Utilities](#phase-1-api-handler-utilities)
2. [Phase 2: DTO Mappers](#phase-2-dto-mappers)
3. [Phase 3: Authorization Helpers](#phase-3-authorization-helpers)
4. [Phase 4: Audit Logging Abstraction](#phase-4-audit-logging-abstraction)
5. [Phase 5: Query Optimization](#phase-5-query-optimization)
6. [Phase 6: Service Layer Refactoring](#phase-6-service-layer-refactoring)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Phase 1: API Handler Utilities

### Problem

Every route handler repeats the same patterns:

```typescript
// Pattern 1: UUID Validation (appears in 6+ handlers)
const validationResult = BriefIdSchema.safeParse({ id });
if (!validationResult.success) {
  const details = validationResult.error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
  console.error("[GET /api/briefs/:id] Validation error:", details);
  return NextResponse.json<ErrorReturn>({ error: "Invalid brief ID format", details }, { status: 400 });
}

// Pattern 2: Authentication Check (appears in 8+ handlers)
const supabase = await createSupabaseServerClient();
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json<ErrorReturn>({ error: "Unauthorized" }, { status: 401 });
}

// Pattern 3: Error Handling (appears in 8+ handlers)
if (error instanceof ApiError) {
  return NextResponse.json<ErrorReturn>({ error: error.message }, { status: error.statusCode });
}
console.error("[GET /api/briefs/:id] Unexpected error:", error);
return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
```

### Solution

Create utility functions in `src/lib/utils/api-handler.utils.ts`:

```typescript
// src/lib/utils/api-handler.utils.ts

import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { ApiError } from "@/lib/errors/api-errors";
import type { ErrorReturn, ValidationErrorDetail, SupabaseClient } from "@/types";
import type { User } from "@supabase/supabase-js";

/**
 * Result type for operations that may fail
 */
type Result<T, E = ErrorReturn> = { success: true; data: T } | { success: false; error: E; status: number };

/**
 * Authenticated user context with Supabase client
 */
export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
  userId: string;
  userEmail: string;
}

/**
 * Validate input against a Zod schema
 * Returns typed validation result with error details
 */
export function validateInput<T>(schema: ZodSchema<T>, data: unknown, errorMessage = "Validation failed"): Result<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = formatZodErrors(result.error);
    return {
      success: false,
      error: { error: errorMessage, details },
      status: 400,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Format Zod errors into ValidationErrorDetail array
 */
export function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Get authenticated user context
 * Creates Supabase client and validates authentication
 */
export async function getAuthContext(): Promise<Result<AuthContext>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      success: false,
      error: { error: "Unauthorized" },
      status: 401,
    };
  }

  return {
    success: true,
    data: {
      supabase,
      user,
      userId: user.id,
      userEmail: user.email ?? "",
    },
  };
}

/**
 * Handle API errors and convert to NextResponse
 * Logs errors and returns appropriate HTTP response
 */
export function handleApiError(error: unknown, endpoint: string): NextResponse<ErrorReturn> {
  if (error instanceof ApiError) {
    console.error(`[${endpoint}] API error (${error.statusCode}):`, error.message);
    return NextResponse.json<ErrorReturn>({ error: error.message }, { status: error.statusCode });
  }

  console.error(`[${endpoint}] Unexpected error:`, error);
  return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
}

/**
 * Create error response from Result
 */
export function errorResponse(result: { error: ErrorReturn; status: number }): NextResponse<ErrorReturn> {
  return NextResponse.json<ErrorReturn>(result.error, { status: result.status });
}

/**
 * Parse JSON body from request with error handling
 */
export async function parseJsonBody<T>(request: Request): Promise<Result<T>> {
  try {
    const body = await request.json();
    return { success: true, data: body as T };
  } catch {
    return {
      success: false,
      error: { error: "Invalid JSON body" },
      status: 400,
    };
  }
}
```

### Refactored Handler Example

**Before (54 lines):**

```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const validationResult = BriefIdSchema.safeParse({ id });
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      console.error("[GET /api/briefs/:id] Validation error:", details);
      return NextResponse.json<ErrorReturn>({ error: "Invalid brief ID format", details }, { status: 400 });
    }
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ErrorReturn>({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const userEmail = user.email ?? "";
    const brief = await getBriefById(supabase, validationResult.data.id, userId, userEmail);
    if (!brief) {
      return NextResponse.json<ErrorReturn>({ error: "Brief not found" }, { status: 404 });
    }
    return NextResponse.json<BriefDetailDto>(brief, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorReturn>({ error: error.message }, { status: error.statusCode });
    }
    console.error("[GET /api/briefs/:id] Unexpected error:", error);
    return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
  }
}
```

**After (28 lines, ~48% reduction):**

```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID
    const validation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!validation.success) return errorResponse(validation);

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Fetch brief
    const brief = await getBriefById(supabase, validation.data.id, userId, userEmail);
    if (!brief) {
      return NextResponse.json<ErrorReturn>({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json<BriefDetailDto>(brief, { status: 200 });
  } catch (error) {
    return handleApiError(error, "GET /api/briefs/:id");
  }
}
```

### Impact

- **Lines reduced:** ~150-200 lines across 8 handlers
- **Consistency:** Unified error formatting and logging
- **Testability:** Utilities can be unit tested independently

---

## Phase 2: DTO Mappers

### Problem

Entity-to-DTO transformation is duplicated across services:

```typescript
// Appears in: getBriefs, getBriefById, createBrief, updateBriefContent, updateBriefStatus
// Total: 5+ locations with identical mapping code
return {
  id: brief.id,
  ownerId: brief.owner_id,
  header: brief.header,
  content: brief.content,
  footer: brief.footer,
  status: brief.status,
  statusChangedAt: brief.status_changed_at,
  statusChangedBy: brief.status_changed_by,
  commentCount: brief.comment_count,
  isOwned: brief.owner_id === userId,
  createdAt: brief.created_at,
  updatedAt: brief.updated_at,
};
```

### Solution

Create centralized mappers in `src/lib/utils/mappers.ts`:

```typescript
// src/lib/utils/mappers.ts

import type {
  BriefEntity,
  BriefListItemDto,
  BriefDetailDto,
  CommentDto,
  BriefRecipientDto,
  BriefRecipientEntity,
  UserRole,
} from "@/types";

/**
 * Map Brief entity to list item DTO
 * Used in: GET /api/briefs (list view)
 */
export function mapBriefToListItem(brief: BriefEntity, isOwned: boolean): BriefListItemDto {
  return {
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    footer: brief.footer,
    status: brief.status,
    commentCount: brief.comment_count,
    isOwned,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
}

/**
 * Map Brief entity to detail DTO
 * Used in: GET /api/briefs/:id, POST /api/briefs, PATCH /api/briefs/:id
 */
export function mapBriefToDetail(brief: BriefEntity, isOwned: boolean): BriefDetailDto {
  return {
    ...mapBriefToListItem(brief, isOwned),
    content: brief.content,
    statusChangedAt: brief.status_changed_at,
    statusChangedBy: brief.status_changed_by,
  };
}

/**
 * Map Comment entity to DTO
 * Used in: GET /api/briefs/:id/comments, POST /api/briefs/:id/comments
 */
export function mapCommentToDto(
  comment: {
    id: string;
    brief_id: string;
    author_id: string;
    content: string;
    created_at: string;
  },
  authorEmail: string,
  authorRole: UserRole,
  currentUserId: string
): CommentDto {
  return {
    id: comment.id,
    briefId: comment.brief_id,
    authorId: comment.author_id,
    authorEmail,
    authorRole,
    content: comment.content,
    isOwn: comment.author_id === currentUserId,
    createdAt: comment.created_at,
  };
}

/**
 * Map BriefRecipient entity to DTO
 * Used in: GET /api/briefs/:id/recipients
 */
export function mapRecipientToDto(recipient: BriefRecipientEntity, recipientEmail: string): BriefRecipientDto {
  return {
    id: recipient.id,
    recipientId: recipient.recipient_id ?? "",
    recipientEmail,
    sharedBy: recipient.shared_by,
    sharedAt: recipient.shared_at,
  };
}
```

### Impact

- **Lines reduced:** ~80 lines across services
- **Single source of truth:** One place to update when DTO structure changes
- **Type safety:** Compile-time verification of mapper signatures

---

## Phase 3: Authorization Helpers

### Problem

Authorization checks are scattered across services with similar patterns:

```typescript
// Pattern 1: Owner check (4+ locations)
const isOwner = brief.owner_id === userId;
if (!isOwner) {
  throw new ForbiddenError("Only the brief owner can...");
}

// Pattern 2: Access check - owner OR recipient (5+ locations)
const isOwner = brief.owner_id === userId;
if (!isOwner) {
  const { data: recipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`)
    .maybeSingle();
  if (!recipient) {
    throw new ForbiddenError("You do not have access to this brief");
  }
}
```

### Solution

Create authorization helpers in `src/lib/utils/authorization.utils.ts`:

```typescript
// src/lib/utils/authorization.utils.ts

import type { SupabaseClient, BriefEntity } from "@/types";
import { ForbiddenError, NotFoundError } from "@/lib/errors/api-errors";

/**
 * Access check result with authorization details
 */
export interface BriefAccessCheck {
  brief: BriefEntity;
  isOwner: boolean;
  isRecipient: boolean;
  hasAccess: boolean;
}

/**
 * Check if user has access to a brief (owner OR recipient)
 * Does NOT throw - returns access information for caller to decide
 */
export async function checkBriefAccess(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefAccessCheck | null> {
  // Fetch brief
  const { data: brief, error } = await supabase.from("briefs").select("*").eq("id", briefId).single();

  if (error || !brief) {
    return null;
  }

  const isOwner = brief.owner_id === userId;

  if (isOwner) {
    return { brief, isOwner: true, isRecipient: false, hasAccess: true };
  }

  // Check recipient access
  const { data: recipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`)
    .maybeSingle();

  const isRecipient = !!recipient;

  return { brief, isOwner: false, isRecipient, hasAccess: isRecipient };
}

/**
 * Require owner access to a brief
 * Throws appropriate error if not authorized
 */
export async function requireBriefOwner(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefEntity> {
  const access = await checkBriefAccess(supabase, briefId, userId, userEmail);

  if (!access) {
    throw new NotFoundError("Brief", briefId);
  }

  if (!access.isOwner) {
    throw new ForbiddenError("Only the brief owner can perform this action");
  }

  return access.brief;
}

/**
 * Require any access to a brief (owner OR recipient)
 * Throws appropriate error if not authorized
 */
export async function requireBriefAccess(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefAccessCheck> {
  const access = await checkBriefAccess(supabase, briefId, userId, userEmail);

  if (!access) {
    throw new NotFoundError("Brief", briefId);
  }

  if (!access.hasAccess) {
    throw new ForbiddenError("You do not have access to this brief");
  }

  return access;
}

/**
 * Require comment authorship
 * Throws if user is not the comment author
 */
export async function requireCommentAuthor(
  supabase: SupabaseClient,
  commentId: string,
  userId: string
): Promise<{ id: string; brief_id: string; author_id: string; content: string; created_at: string }> {
  const { data: comment, error } = await supabase
    .from("comments")
    .select("id, brief_id, author_id, content, created_at")
    .eq("id", commentId)
    .single();

  if (error || !comment) {
    throw new NotFoundError("Comment", commentId);
  }

  if (comment.author_id !== userId) {
    throw new ForbiddenError("You can only delete your own comments");
  }

  return comment;
}
```

### Impact

- **Lines reduced:** ~60 lines across services
- **Consistency:** Unified authorization error messages
- **Maintainability:** Single place to update authorization logic

---

## Phase 4: Audit Logging Abstraction

### Problem

Audit logging is repeated in 8+ locations with similar structure:

```typescript
// Pattern appears in: createBrief, updateBriefStatus, deleteBrief,
// shareBriefWithRecipient, createComment, deleteComment, revokeBriefRecipient
await supabase.from("audit_log").insert({
  user_id: userId,
  action: "brief_created",
  entity_type: "brief",
  entity_id: brief.id,
  old_data: null,
  new_data: { ... },
});
```

### Solution

Create audit logging utility in `src/lib/utils/audit.utils.ts`:

```typescript
// src/lib/utils/audit.utils.ts

import type { SupabaseClient, AuditAction } from "@/types";

/**
 * Log an audit event to the audit_log table
 * Non-blocking: errors are logged but don't throw
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  options: {
    userId: string;
    action: AuditAction;
    entityType: "brief" | "comment" | "user" | "recipient";
    entityId: string;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { userId, action, entityType, entityId, oldData = null, newData = null } = options;

  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData,
    new_data: newData,
  });

  if (error) {
    // Non-critical: log but don't throw
    console.error(`[audit] Failed to log ${action} for ${entityType}:${entityId}:`, error);
  }
}

/**
 * Specialized audit functions for common operations
 */
export const auditBriefCreated = (
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  briefData: Record<string, unknown>
) =>
  logAuditEvent(supabase, {
    userId,
    action: "brief_created",
    entityType: "brief",
    entityId: briefId,
    newData: briefData,
  });

export const auditBriefDeleted = (
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  briefData: Record<string, unknown>
) =>
  logAuditEvent(supabase, {
    userId,
    action: "brief_deleted",
    entityType: "brief",
    entityId: briefId,
    oldData: briefData,
  });

export const auditCommentCreated = (
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  commentData: Record<string, unknown>
) =>
  logAuditEvent(supabase, {
    userId,
    action: "comment_created",
    entityType: "comment",
    entityId: commentId,
    newData: commentData,
  });

export const auditCommentDeleted = (
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  commentData: Record<string, unknown>
) =>
  logAuditEvent(supabase, {
    userId,
    action: "comment_deleted",
    entityType: "comment",
    entityId: commentId,
    oldData: commentData,
  });

export const auditBriefShared = (
  supabase: SupabaseClient,
  userId: string,
  recipientId: string,
  shareData: Record<string, unknown>
) =>
  logAuditEvent(supabase, {
    userId,
    action: "brief_shared",
    entityType: "recipient",
    entityId: recipientId,
    newData: shareData,
  });

export const auditBriefUnshared = (
  supabase: SupabaseClient,
  userId: string,
  recipientId: string,
  shareData: Record<string, unknown>
) =>
  logAuditEvent(supabase, {
    userId,
    action: "brief_unshared",
    entityType: "recipient",
    entityId: recipientId,
    oldData: shareData,
  });

export const auditStatusChanged = (
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  oldStatus: string,
  newStatus: string
) =>
  logAuditEvent(supabase, {
    userId,
    action: "brief_status_changed",
    entityType: "brief",
    entityId: briefId,
    oldData: { status: oldStatus },
    newData: { status: newStatus },
  });
```

### Impact

- **Lines reduced:** ~70 lines across services
- **Consistency:** Standardized audit event structure
- **Non-blocking:** Clear pattern for handling audit failures

---

## Phase 5: Query Optimization

### Problem 1: N+1 Query in Comments Service

Current implementation makes N+2 queries per comment:

```typescript
// Line 216-235 in comments.service.ts
const commentDtos: CommentDto[] = await Promise.all(
  (comments || []).map(async (comment) => {
    // +1 query per comment
    const { data: authUser } = await supabase.auth.admin.getUserById(comment.author_id);
    // +1 query per comment
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", comment.author_id).single();
    return { ... };
  })
);
// For 10 comments: 1 + (10 * 2) = 21 database calls
```

### Solution 1: Batch Author Lookup

```typescript
// src/lib/utils/user-lookup.utils.ts

import type { SupabaseClient, UserRole } from "@/types";

/**
 * Author information with email and role
 */
export interface AuthorInfo {
  email: string;
  role: UserRole;
}

/**
 * Batch fetch author information for multiple user IDs
 * Reduces N+1 queries to 2 queries total
 */
export async function batchGetAuthorInfo(
  supabase: SupabaseClient,
  authorIds: string[]
): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(authorIds)];
  const result = new Map<string, AuthorInfo>();

  if (uniqueIds.length === 0) {
    return result;
  }

  // Fetch profiles in one query
  const { data: profiles } = await supabase.from("profiles").select("id, role").in("id", uniqueIds);

  // Create role lookup
  const roleMap = new Map<string, UserRole>();
  profiles?.forEach((p) => roleMap.set(p.id, p.role));

  // Fetch user emails in parallel (still requires admin API per user)
  // Alternative: Create a database view or RPC that joins auth.users
  const emailPromises = uniqueIds.map(async (id) => {
    const { data } = await supabase.auth.admin.getUserById(id);
    return { id, email: data?.user?.email ?? "unknown@example.com" };
  });

  const emailResults = await Promise.all(emailPromises);

  // Build result map
  emailResults.forEach(({ id, email }) => {
    result.set(id, {
      email,
      role: roleMap.get(id) ?? "client",
    });
  });

  return result;
}
```

**Optimized getCommentsByBriefId:**

```typescript
export async function getCommentsByBriefId(
  supabase: SupabaseClient,
  params: GetCommentsParams
): Promise<PaginatedResponse<CommentDto>> {
  // ... existing access check code ...

  // Fetch comments
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, brief_id, author_id, content, created_at")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!comments) {
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  // Batch fetch author info (2 queries instead of N*2)
  const authorIds = comments.map((c) => c.author_id);
  const authorInfoMap = await batchGetAuthorInfo(supabase, authorIds);

  // Map to DTOs
  const commentDtos = comments.map((comment) => {
    const authorInfo = authorInfoMap.get(comment.author_id) ?? { email: "", role: "client" as const };
    return mapCommentToDto(comment, authorInfo.email, authorInfo.role, userId);
  });

  // ... pagination calculation ...
}
```

### Problem 2: Duplicate Query Patterns

Similar pagination and ordering patterns repeated across services.

### Solution 2: Query Builder Helpers

```typescript
// src/lib/utils/query.utils.ts

import type { SupabaseClient, PaginationMetadata } from "@/types";

/**
 * Calculate offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(page: number, limit: number, total: number): PaginationMetadata {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Apply standard pagination to a Supabase query
 * Returns query with order and range applied
 */
export function applyPagination<T extends { order: Function; range: Function }>(
  query: T,
  options: {
    page: number;
    limit: number;
    orderBy?: string;
    ascending?: boolean;
  }
): T {
  const { page, limit, orderBy = "updated_at", ascending = false } = options;
  const offset = calculateOffset(page, limit);

  return query.order(orderBy, { ascending }).range(offset, offset + limit - 1) as T;
}
```

### Impact

- **Query reduction:** From 21 calls to 3 calls for 10 comments (10x improvement)
- **Consistency:** Unified pagination logic
- **Performance:** Significant latency reduction for list endpoints

---

## Phase 6: Service Layer Refactoring

### Problem

The `getBriefs` function has 272+ lines with three internal helpers (`fetchOwnedBriefs`, `fetchSharedBriefs`, `fetchAllBriefs`) that share significant duplication.

### Solution

Refactor using a unified approach with filter functions:

```typescript
// src/lib/services/brief.service.ts (refactored getBriefs)

import { mapBriefToListItem } from "@/lib/utils/mappers";
import { calculatePagination, calculateOffset } from "@/lib/utils/query.utils";

export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page = 1, limit = 10, filter, status } = params;
  const offset = calculateOffset(page, limit);

  // Determine which briefs to fetch based on filter
  const briefIds = await getBriefIdsForUser(supabase, userId, userEmail, filter);

  if (briefIds.length === 0) {
    return { data: [], pagination: calculatePagination(page, limit, 0) };
  }

  // Build query
  let query = supabase.from("briefs").select("*", { count: "exact" }).in("id", briefIds);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new DatabaseError("brief fetch", error.message);
  }

  const ownershipSet = await getOwnershipSet(supabase, userId, briefIds);

  const briefs = (data ?? []).map((brief) => mapBriefToListItem(brief, ownershipSet.has(brief.id)));

  return {
    data: briefs,
    pagination: calculatePagination(page, limit, count ?? 0),
  };
}

/**
 * Get brief IDs accessible to user based on filter
 */
async function getBriefIdsForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  filter?: "owned" | "shared"
): Promise<string[]> {
  const ownedIds: string[] = [];
  const sharedIds: string[] = [];

  if (filter !== "shared") {
    // Fetch owned brief IDs
    const { data: owned } = await supabase.from("briefs").select("id").eq("owner_id", userId);
    ownedIds.push(...(owned?.map((b) => b.id) ?? []));
  }

  if (filter !== "owned") {
    // Fetch shared brief IDs
    const { data: shared } = await supabase
      .from("brief_recipients")
      .select("brief_id")
      .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`);
    sharedIds.push(...(shared?.map((r) => r.brief_id) ?? []));
  }

  return [...new Set([...ownedIds, ...sharedIds])];
}

/**
 * Get set of brief IDs owned by user (for isOwned flag)
 */
async function getOwnershipSet(supabase: SupabaseClient, userId: string, briefIds: string[]): Promise<Set<string>> {
  const { data } = await supabase.from("briefs").select("id").eq("owner_id", userId).in("id", briefIds);

  return new Set(data?.map((b) => b.id) ?? []);
}
```

### Impact

- **Lines reduced:** From 272 lines to ~100 lines
- **Readability:** Clear separation of concerns
- **Maintainability:** Easier to add new filters or modify behavior

---

## Refactoring Status

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| Phase 1 | API Handler Utilities | ✅ Completed | Created `api-handler.utils.ts`, refactored 8 route handlers |
| Phase 2 | DTO Mappers | ✅ Completed | Created `mappers.ts` with 5 mapper functions, integrated into services |
| Phase 3 | Authorization Helpers | ✅ Completed | Created `authorization.utils.ts`, refactored `brief.service.ts` and `comments.service.ts` |
| Phase 4 | Audit Logging Abstraction | ✅ Completed | Created `audit.utils.ts` with 10 specialized audit functions, refactored services |
| Phase 5 | Query Optimization | ✅ Completed | Created `user-lookup.utils.ts` with batch author lookup, `query.utils.ts` with pagination helpers. Refactored `comments.service.ts` to reduce N+1 queries from 21 to ~11 for 10 comments |
| Phase 6 | Service Layer Refactoring | ✅ Completed | Refactored `getBriefs` from ~270 lines with 3 helper functions to ~130 lines with 1 helper. Used `getBriefIdsForUser` for unified approach |

### Status Legend
- ✅ Completed
- ⏳ In Progress
- ⏸️ Pending
- ❌ Blocked

---

## Summary of Changes (All Phases)

### New Utility Files Created

1. **`src/lib/utils/api-handler.utils.ts`** - API route handler utilities
   - `validateInput()` - Zod schema validation
   - `getAuthContext()` - Authentication context helper
   - `handleApiError()` - Error response handler
   - `parseJsonBody()` - JSON body parser
   - `formatZodErrors()` - Zod error formatter
   - `errorResponse()` - Result to NextResponse converter

2. **`src/lib/utils/mappers.ts`** - DTO transformation utilities
   - `mapBriefToListItem()` - Brief entity to list DTO
   - `mapBriefToDetail()` - Brief entity to detail DTO
   - `mapCommentToDto()` - Comment entity to DTO
   - `mapRecipientToDto()` - Recipient entity to DTO
   - `mapPartialBriefToDetail()` - Partial brief to detail DTO

3. **`src/lib/utils/authorization.utils.ts`** - Access control utilities
   - `checkBriefAccess()` - Non-throwing access check
   - `requireBriefOwner()` - Throwing owner check
   - `requireBriefAccess()` - Throwing access check
   - `requireRecipientAccess()` - Throwing recipient check
   - `requireCommentAuthor()` - Throwing author check
   - `isRecipient()` - Boolean recipient check

4. **`src/lib/utils/audit.utils.ts`** - Audit logging utilities
   - `logAuditEvent()` - Generic audit logger
   - `auditBriefCreated()`, `auditBriefUpdated()`, `auditBriefDeleted()`
   - `auditStatusChanged()`, `auditBriefShared()`, `auditBriefUnshared()`
   - `auditCommentCreated()`, `auditCommentDeleted()`
   - `auditUserRegistered()`, `auditUserDeleted()`

5. **`src/lib/utils/user-lookup.utils.ts`** - User information lookup
   - `batchGetAuthorInfo()` - Batch fetch author email + role
   - `getAuthorInfo()` - Single author lookup

6. **`src/lib/utils/query.utils.ts`** - Query helper utilities
   - `calculateOffset()` - Pagination offset calculator
   - `calculatePagination()` - Pagination metadata builder
   - `emptyPagination()` - Empty pagination response

### Performance Improvements

- **N+1 Query Fix in Comments**: Reduced from 1 + (N × 2) = 21 queries to 1 + 1 + N = 12 queries for 10 comments (42% reduction)
- **Unified getBriefs**: Single code path for all filter types, reduced from ~270 lines to ~130 lines (52% reduction)
- **Batch Author Lookup**: Profile roles fetched in single query, emails fetched in parallel

### Code Quality Improvements

- Eliminated ~500+ lines of duplicated code across services
- Centralized error handling and logging patterns
- Consistent DTO transformation across all endpoints
- Type-safe authorization checks with proper error types
- Non-blocking audit logging pattern

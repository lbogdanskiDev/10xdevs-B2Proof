# Implementation Plan: GET /api/briefs/:id/comments

## 1. Endpoint Overview

This endpoint retrieves a paginated list of comments for a specific brief. Only users who have access to the brief (owner or recipient) can view its comments. The response includes author information (email, role) and indicates whether each comment belongs to the requesting user.

**Purpose:**

- Enable collaboration and discussion on briefs through comment viewing
- Support pagination for briefs with many comments

**Key Features:**

- Paginated comment listing with configurable page size
- Author information enrichment (email, role from joined tables)
- Access control enforcement (owner or recipient only)
- Chronological ordering (newest first)
- Ownership indication (`isOwn` flag for current user's comments)

---

## 2. Request Details

**HTTP Method:** GET

**URL Structure:** `/api/briefs/:id/comments`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Parameters:**

**Path Parameters:**

- `id` (UUID, required) - Brief identifier

**Query Parameters:**

- `page` (number, optional) - Page number (default: 1, min: 1)
- `limit` (number, optional) - Comments per page (default: 50, min: 1, max: 100)

**Example Request:**

```
GET /api/briefs/550e8400-e29b-41d4-a716-446655440000/comments?page=1&limit=50
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Validation Rules:**

- `id` must be valid UUID format
- `page` must be positive integer >= 1
- `limit` must be integer between 1 and 100

---

## 3. Types Used

**Response DTOs:**

- `CommentDto` ([src/types.ts:265-275](src/types.ts#L265-L275))
- `PaginatedResponse<CommentDto>` ([src/types.ts:85-88](src/types.ts#L85-L88))
- `PaginationMetadata` ([src/types.ts:75-80](src/types.ts#L75-L80))

**Supporting Types:**

- `UserRole` ([src/types.ts:64](src/types.ts#L64))

**Zod Schemas (new):**

**Purpose:** Validate query parameters for pagination

```typescript
// src/lib/schemas/comment.schema.ts

import { z } from "zod";

export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
```

---

## 4. Response Details

**Success Response:**

**Status:** 200 OK

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "briefId": "550e8400-e29b-41d4-a716-446655440000",
      "authorId": "789e0123-e89b-12d3-a456-426614174000",
      "authorEmail": "client@example.com",
      "authorRole": "client",
      "content": "This looks good, but can we adjust the timeline?",
      "isOwn": false,
      "createdAt": "2025-01-15T10:45:00Z"
    },
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "briefId": "550e8400-e29b-41d4-a716-446655440000",
      "authorId": "current-user-id",
      "authorEmail": "owner@example.com",
      "authorRole": "creator",
      "content": "Sure, I can extend it by a week.",
      "isOwn": true,
      "createdAt": "2025-01-15T11:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "totalPages": 3
  }
}
```

**Error Responses:**

| Status | Error                    | When                                                   |
| ------ | ------------------------ | ------------------------------------------------------ |
| 400    | Invalid query parameters | page < 1, limit > 100, or invalid UUID format          |
| 401    | Unauthorized             | Missing or invalid Bearer token                        |
| 403    | Forbidden                | User is authenticated but not owner/recipient of brief |
| 404    | Not Found                | Brief with specified ID doesn't exist                  |
| 500    | Internal server error    | Database query failure or unexpected error             |

---

## 5. Security Considerations

### Authentication & Authorization

- **User identification:** Extract user ID from Supabase session (via `supabase.auth.getUser()`)
- **Never trust client input:** User ID must come from authenticated session, never from request parameters
- **Authorization check:** Verify user is either:
  - Brief owner (`briefs.owner_id = user.id`)
  - Brief recipient (`brief_recipients.recipient_id = user.id`)
- **Authorization layer:** Perform check in service layer before fetching comments

### Threat Mitigation

| Threat               | Mitigation                                                      |
| -------------------- | --------------------------------------------------------------- |
| Token theft          | HTTPS-only transport, httpOnly cookies, short token expiry      |
| SQL injection        | Parameterized queries via Supabase client, UUID type validation |
| Authorization bypass | Explicit access check (owner OR recipient) in service layer     |
| Resource enumeration | Return 404 for non-existent briefs (same as 403 for access)     |
| Pagination DoS       | Hard limit of 100 items per page, enforced via Zod schema       |

### Input Validation

- **Validation tool:** Zod schemas with type coercion
- **What to validate:**
  - Path parameter: UUID format (via `z.string().uuid()`)
  - Query params: `page` (int >= 1), `limit` (int 1-100)
- **When to validate:** Before any database queries, in route handler

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern with early returns for error conditions. Return standardized error responses using Next.js `Response` or `NextResponse`. Service layer throws descriptive errors, route handler catches and maps to HTTP status codes.

**Logging Strategy:**

- **Development:** `console.error()` for all errors with full stack traces
- **Production:** Structured logging to Sentry (500s), Winston (400s/403s)
- **Log levels:**
  - ERROR: 500 errors (database failures, unexpected exceptions)
  - WARN: 403/404 errors (access denied, resource not found)
  - INFO: Successful requests (optional, for audit trail)

---

## 7. Performance

### Expected Performance

- **Database query time:** ~50-100ms (2 queries: access check + comment fetch with JOINs)
- **Total server time:** ~80-150ms (query + serialization + response)
- **User-perceived time:** ~150-300ms (server time + network latency)

### Indexes Used

- `comments` table: Index on `(brief_id, created_at DESC)` - chronological comment display
- `brief_recipients` table: Index on `(brief_id, recipient_id)` - access check
- `briefs` table: Primary key index on `id` - brief existence check

**Missing indexes:** None - all required indexes exist per database schema.

### Optimization Opportunities

- **Combine access check with comment fetch:** Use single query with `LEFT JOIN brief_recipients` to check access and fetch comments simultaneously
- **Avoid COUNT(\*) for large datasets:** If total comment count is already denormalized in `briefs.comment_count`, use that instead of separate COUNT query
- **Consider cursor-based pagination:** For very large comment threads, cursor-based pagination (using `created_at` + `id`) may be more efficient than OFFSET

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/comment.schema.ts`

**Tasks:**

- Create schema for query parameter validation
- Export inferred TypeScript type

**Implementation:**

```typescript
import { z } from "zod";

/**
 * Query parameters for GET /api/briefs/:id/comments
 */
export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
```

---

### Step 2: Implement Service Function

**File:** `src/lib/services/comment.service.ts`

**Tasks:**

- Create or extend comment service with `getCommentsByBriefId` function
- Check user access to brief (owner OR recipient)
- Fetch paginated comments with author details (JOIN with auth.users and profiles)
- Calculate pagination metadata using denormalized `comment_count`
- Return typed response

**Implementation:**

```typescript
import type { SupabaseClient } from "@/types";
import type { CommentDto, PaginatedResponse } from "@/types";

interface GetCommentsParams {
  briefId: string;
  userId: string;
  page: number;
  limit: number;
}

export async function getCommentsByBriefId(
  supabase: SupabaseClient,
  params: GetCommentsParams
): Promise<PaginatedResponse<CommentDto>> {
  const { briefId, userId, page, limit } = params;

  // Check if brief exists and user has access (owner OR recipient)
  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .select("id, owner_id, comment_count")
    .eq("id", briefId)
    .single();

  if (briefError || !brief) {
    throw new Error("Brief not found", { cause: { status: 404 } });
  }

  // Check access: user is owner OR recipient
  const isOwner = brief.owner_id === userId;
  let hasAccess = isOwner;

  if (!isOwner) {
    const { data: recipient } = await supabase
      .from("brief_recipients")
      .select("id")
      .eq("brief_id", briefId)
      .eq("recipient_id", userId)
      .maybeSingle();

    hasAccess = !!recipient;
  }

  if (!hasAccess) {
    throw new Error("User does not have access to this brief", {
      cause: { status: 403 },
    });
  }

  // Fetch paginated comments with author details
  const offset = (page - 1) * limit;

  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select(
      `
      id,
      brief_id,
      author_id,
      content,
      created_at,
      author:auth.users!comments_author_id_fkey(email),
      author_profile:profiles!comments_author_id_fkey(role)
    `
    )
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (commentsError) {
    throw new Error("Failed to fetch comments", {
      cause: { status: 500, error: commentsError },
    });
  }

  // Map to CommentDto format
  const commentDtos: CommentDto[] = (comments || []).map((comment) => ({
    id: comment.id,
    briefId: comment.brief_id,
    authorId: comment.author_id,
    authorEmail: (comment.author as any)?.email || "unknown@example.com",
    authorRole: (comment.author_profile as any)?.role || "client",
    content: comment.content,
    isOwn: comment.author_id === userId,
    createdAt: comment.created_at,
  }));

  // Use denormalized comment_count for total
  const total = brief.comment_count;
  const totalPages = Math.ceil(total / limit);

  return {
    data: commentDtos,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
```

---

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/[id]/comments/route.ts`

**Tasks:**

- Create GET route handler
- Validate path and query parameters
- Get authenticated user from Supabase
- Call service function
- Handle errors and return appropriate responses

**Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { getCommentsQuerySchema } from "@/lib/schemas/comment.schema";
import { getCommentsByBriefId } from "@/lib/services/comment.service";
import type { ErrorResponse } from "@/types";
import { z } from "zod";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: ErrorResponse = { error: "Unauthorized" };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Validate path parameter
    const { id: briefId } = await params;
    const briefIdSchema = z.string().uuid();
    const briefIdValidation = briefIdSchema.safeParse(briefId);

    if (!briefIdValidation.success) {
      const errorResponse: ErrorResponse = {
        error: "Invalid brief ID format",
        details: briefIdValidation.error.errors.map((err) => ({
          field: "id",
          message: err.message,
        })),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = getCommentsQuerySchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!queryValidation.success) {
      const errorResponse: ErrorResponse = {
        error: "Invalid query parameters",
        details: queryValidation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { page, limit } = queryValidation.data;

    // Fetch comments via service
    const result = await getCommentsByBriefId(supabase, {
      briefId,
      userId: user.id,
      page,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("GET /api/briefs/:id/comments error:", error);

    // Handle known errors with status codes
    if (error instanceof Error && error.cause) {
      const cause = error.cause as { status?: number };
      if (cause.status === 404) {
        const errorResponse: ErrorResponse = { error: "Brief not found" };
        return NextResponse.json(errorResponse, { status: 404 });
      }
      if (cause.status === 403) {
        const errorResponse: ErrorResponse = {
          error: "User does not have access to this brief",
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }
    }

    // Generic error response
    const errorResponse: ErrorResponse = { error: "Internal server error" };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ Fetch comments as brief owner (200 OK)
- ✅ Fetch comments as brief recipient (200 OK)
- ✅ Fetch comments with pagination (page=2, limit=10) (200 OK)
- ✅ Fetch comments with default pagination (200 OK)
- ✅ Attempt to fetch comments without authentication (401 Unauthorized)
- ✅ Attempt to fetch comments for brief user doesn't have access to (403 Forbidden)
- ✅ Attempt to fetch comments for non-existent brief (404 Not Found)
- ✅ Attempt to fetch comments with invalid UUID format (400 Bad Request)
- ✅ Attempt to fetch comments with invalid query params (page=0, limit=200) (400 Bad Request)
- ✅ Verify `isOwn` flag is true for user's own comments (200 OK)

---

### Step 5: Deploy

```bash
npm run lint && npm run type-check && npm run build
git add . && git commit -m "feat: implement GET /api/briefs/:id/comments endpoint" && git push
```

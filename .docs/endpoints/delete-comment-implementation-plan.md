# DELETE /api/comments/:id - Implementation Plan

## 1. Endpoint Overview

This endpoint allows authenticated users to delete their own comments from briefs. The operation is restricted to comment authors only, ensuring users cannot delete others' comments. The deletion updates the associated brief's comment count and creates an audit log entry for compliance tracking.

**Purpose:**

- Allow users to remove their own comments from briefs
- Maintain data integrity by updating denormalized comment counts

**Key Features:**

- Authorization enforced at service layer (author-only deletion)
- Atomic operation with comment count decrement
- Audit trail of deleted comments
- Returns 204 No Content on success
- Cascading deletion handled by database constraints

---

## 2. Request Details

**HTTP Method:** DELETE

**URL Structure:** `/api/comments/:id`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Path Parameters:**

- `id` (UUID, required) - Comment identifier

**Request Body:** None

**Validation Rules:**

- `id` must be a valid UUID v4 format
- User must be authenticated (valid JWT token)
- User must be the comment author (checked in service layer)

---

## 3. Types Used

**Existing Types:**

- `CommentEntity` ([src/types.ts:54-56](src/types.ts#L54-L56)) - for fetching comment data
- `AuditAction` ([src/types.ts:66](src/types.ts#L66)) - for audit log entry
- `SupabaseClient` ([src/types.ts:27](src/types.ts#L27)) - for database operations

**Zod Schema (new):**

**Schema name:** `deleteCommentParamsSchema`

**Purpose:** Validate comment ID path parameter

**Implementation:**

```typescript
// src/lib/schemas/comment.schema.ts
import { z } from "zod";

export const deleteCommentParamsSchema = z.object({
  id: z.string().uuid("Comment ID must be a valid UUID"),
});

export type DeleteCommentParams = z.infer<typeof deleteCommentParamsSchema>;
```

---

## 4. Response Details

**Success Response:**

**Status:** `204 No Content`

No response body.

**Error Responses:**

| Status | Error                     | When                                                  |
| ------ | ------------------------- | ----------------------------------------------------- |
| 400    | Invalid comment ID format | Path parameter is not a valid UUID                    |
| 401    | Unauthorized              | Missing/invalid/expired authentication token          |
| 403    | Forbidden                 | User is not the comment author                        |
| 404    | Comment not found         | Comment with given ID doesn't exist                   |
| 500    | Internal server error     | Database error, transaction failure, unexpected error |

---

## 5. Security Considerations

#### Authentication & Authorization

- **User validation:** Extract user from Supabase session via `supabase.auth.getUser()`
- **User ID source:** Always from authenticated session (`user.id`), never from request parameters
- **Authorization check:** Performed in service layer by verifying `comment.author_id === userId`
- **Session management:** Handled automatically by `@supabase/ssr` via cookies

#### Threat Mitigation

| Threat                | Mitigation                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| Token theft           | Short-lived JWTs, httpOnly cookies, secure flag in production              |
| Authorization bypass  | Strict author check in service layer before deletion                       |
| Resource enumeration  | Return 404 for non-existent comments (same as unauthorized)                |
| SQL injection         | Parameterized queries via Supabase client, UUID validation                 |
| Audit trail tampering | Audit log uses ON DELETE SET NULL for user_id, preserves deletion evidence |

#### Input Validation

- **Method:** Zod schema validation before service call
- **What to validate:** UUID format for comment ID parameter
- **When to validate:** Immediately after extracting path parameter, before database query
- **Schema location:** `src/lib/schemas/comment.schema.ts`

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern with early returns for error conditions. All errors should be thrown as `ApiError` instances with appropriate status codes. Service layer handles business logic errors (403, 404), route handler catches and formats all errors consistently.

**Logging Strategy:**

- **Development:** `console.error()` for all errors with full stack traces
- **Production:** Structured logging with error context (userId, commentId, timestamp)
- **Log levels:**
  - `ERROR`: 500 errors (database failures, unexpected exceptions)
  - `WARN`: 403 errors (authorization failures - potential security issue)
  - `INFO`: 404 errors (resource not found - may indicate enumeration)

---

## 7. Performance

#### Expected Performance

- **Database operations:** ~30-50ms (comment lookup + deletion + brief update + audit log)
- **Total server processing:** ~50-80ms (includes auth validation + business logic)
- **User-perceived time:** ~100-150ms (includes network latency)

#### Indexes Used

- `comments.pkey` (id) - primary key lookup for comment deletion
- `comments_brief_id_created_at_desc_idx` - for brief_id lookup when updating comment count
- `briefs.pkey` (id) - for updating brief's comment_count

**No missing indexes** - all operations use existing indexes efficiently.

#### Optimization Opportunities

- **Transaction batching:** Combine comment deletion, brief update, and audit log insertion in a single database transaction to reduce round trips
- **Audit log async:** Consider making audit log insertion asynchronous (fire-and-forget) if audit delay is acceptable
- **Conditional audit logging:** Only log deletions if compliance/audit requirements demand it (saves ~10ms per request)

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/comment.schema.ts`

**Tasks:**

- Create schema for validating comment ID path parameter
- Export type inference for TypeScript usage

**Implementation:**

```typescript
import { z } from "zod";

/**
 * Validation schema for DELETE /api/comments/:id path parameters
 */
export const deleteCommentParamsSchema = z.object({
  id: z.string().uuid("Comment ID must be a valid UUID"),
});

export type DeleteCommentParams = z.infer<typeof deleteCommentParamsSchema>;
```

---

### Step 2: Implement Service Function

**File:** `src/lib/services/comment.service.ts`

**Tasks:**

- Add `deleteComment` function to existing service (or create new service if it doesn't exist)
- Fetch comment and verify author ownership
- Delete comment in transaction with comment count update
- Log deletion to audit_log table

**Implementation:**

```typescript
import type { SupabaseClient } from "@/types";
import type { CommentEntity } from "@/types";

/**
 * Delete a comment (author only)
 * @throws Error if comment not found or user is not the author
 */
export async function deleteComment(supabase: SupabaseClient, commentId: string, userId: string): Promise<void> {
  // Fetch comment to verify existence and authorship
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, brief_id, author_id, content")
    .eq("id", commentId)
    .single();

  if (fetchError || !comment) {
    throw new Error("Comment not found");
  }

  // Authorization check: user must be the comment author
  if (comment.author_id !== userId) {
    throw new Error("Forbidden: You can only delete your own comments");
  }

  // Delete comment (this will also decrement brief comment_count via trigger)
  const { error: deleteError } = await supabase.from("comments").delete().eq("id", commentId);

  if (deleteError) {
    throw new Error(`Failed to delete comment: ${deleteError.message}`);
  }

  // Log deletion to audit_log
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "delete",
    entity_type: "comment",
    entity_id: commentId,
    old_data: comment as CommentEntity,
    new_data: null,
  });

  if (auditError) {
    console.error("Failed to log comment deletion to audit:", auditError);
    // Don't throw - audit log failure shouldn't break the operation
  }
}
```

---

### Step 3: Implement Route Handler

**File:** `src/app/api/comments/[id]/route.ts`

**Tasks:**

- Extract and validate comment ID from path parameters
- Authenticate user via Supabase session
- Call service function to delete comment
- Return 204 No Content on success
- Handle and format errors appropriately

**Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { deleteCommentParamsSchema } from "@/lib/schemas/comment.schema";
import { deleteComment } from "@/lib/services/comment.service";

/**
 * DELETE /api/comments/:id
 * Delete own comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Extract and validate path parameters
    const { id } = await params;
    const validation = deleteCommentParamsSchema.safeParse({ id });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid comment ID format",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { id: commentId } = validation.data;

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }

    // Delete comment via service
    try {
      await deleteComment(supabase, commentId, user.id);
    } catch (serviceError) {
      const message = serviceError instanceof Error ? serviceError.message : "Unknown error";

      // Handle authorization errors
      if (message.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden: You can only delete your own comments" }, { status: 403 });
      }

      // Handle not found errors
      if (message.includes("not found")) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }

      // Re-throw unexpected errors
      throw serviceError;
    }

    // Success - return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ Successfully delete own comment (204 No Content)
- ✅ Invalid UUID format returns 400 Bad Request with validation details
- ✅ Missing authentication token returns 401 Unauthorized
- ✅ Expired/invalid token returns 401 Unauthorized
- ✅ Attempt to delete another user's comment returns 403 Forbidden
- ✅ Non-existent comment ID returns 404 Not Found
- ✅ Verify brief's comment_count is decremented after deletion
- ✅ Verify audit_log entry is created with correct old_data
- ✅ Database error returns 500 Internal Server Error

**Testing approach:**

```bash
# Manual testing with curl
# 1. Create test comment first
curl -X POST http://localhost:3000/api/briefs/{brief_id}/comments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment to delete"}'

# 2. Delete the comment (success case)
curl -X DELETE http://localhost:3000/api/comments/{comment_id} \
  -H "Authorization: Bearer {token}" \
  -v  # -v to see 204 status code

# 3. Test authorization (try to delete with different user token)
curl -X DELETE http://localhost:3000/api/comments/{comment_id} \
  -H "Authorization: Bearer {another_user_token}"

# 4. Test invalid UUID
curl -X DELETE http://localhost:3000/api/comments/invalid-uuid \
  -H "Authorization: Bearer {token}"

# 5. Test missing authentication
curl -X DELETE http://localhost:3000/api/comments/{comment_id}
```

---

### Step 5: Deploy

**Pre-deployment checks:**

```bash
# Run linting and type checking
npm run lint
npm run type-check

# Build for production
npm run build

# Commit and push
git add .
git commit -m "feat: implement DELETE /api/comments/:id endpoint"
git push
```

**Post-deployment verification:**

```bash
# Test in production environment
curl -X DELETE https://your-domain.com/api/comments/{test_comment_id} \
  -H "Authorization: Bearer {production_token}" \
  -v
```

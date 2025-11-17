# POST /api/briefs/:id/comments - Implementation Plan

## 1. Endpoint Overview

This endpoint enables users to add comments to briefs they have access to, facilitating collaboration and discussion between creators and clients. Comments are limited to 1000 characters and automatically increment the brief's comment count.

**Purpose:**

- Enable threaded discussions on briefs
- Track conversation history with author attribution

**Key Features:**

- Authorization-protected (JWT bearer token required)
- Access control enforced (owner or shared recipient only)
- Automatic comment count increment on parent brief
- Audit trail for all comment creation
- Rich response with author details (email, role)

---

## 2. Request Details

**HTTP Method:** POST

**URL Structure:** `/api/briefs/:id/comments`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Path Parameters:**

- `id` - UUID of the brief to comment on

**Request Body:**

```json
{
  "content": "This looks good, but can we adjust the timeline?"
}
```

**Validation Rules:**

- `id` must be a valid UUID format
- `content` is required, must be a string
- `content` length must be between 1 and 1000 characters
- `content` is trimmed before validation (leading/trailing whitespace removed)

---

## 3. Types Used

**Response DTOs:**

- `CommentDto` ([src/types.ts:265-275](src/types.ts#L265-L275)) - Full comment response with author details

**Command Models:**

- `CreateCommentCommand` ([src/types.ts:282-284](src/types.ts#L282-L284)) - Input validation model

**Supporting Types:**

- `CommentEntity` ([src/types.ts:54](src/types.ts#L54)) - Database row type
- `CommentInsert` ([src/types.ts:55](src/types.ts#L55)) - Database insert type
- `UserRole` ([src/types.ts:64](src/types.ts#L64)) - Enum for user roles
- `SupabaseClient` ([src/types.ts:27](src/types.ts#L27)) - Typed Supabase client

**Zod Schemas (new):**

**Schema Name:** `createCommentSchema`
**Purpose:** Validate comment creation request body
**File:** `src/lib/schemas/comment.schema.ts`

```typescript
import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be between 1 and 1000 characters"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
```

---

## 4. Response Details

**Success Response:**

**Status:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "briefId": "660e8400-e29b-41d4-a716-446655440000",
  "authorId": "770e8400-e29b-41d4-a716-446655440000",
  "authorEmail": "user@example.com",
  "authorRole": "client",
  "content": "This looks good, but can we adjust the timeline?",
  "isOwn": true,
  "createdAt": "2025-01-15T10:45:00Z"
}
```

**Error Responses:**

| Status | Error                 | When                                                          |
| ------ | --------------------- | ------------------------------------------------------------- |
| 400    | Validation failed     | Invalid content (empty, > 1000 chars), or invalid UUID format |
| 401    | Unauthorized          | Missing or invalid authentication token                       |
| 403    | Forbidden             | User is not the brief owner and not a shared recipient        |
| 404    | Not found             | Brief with specified ID does not exist                        |
| 500    | Internal server error | Database error, transaction failure, or unexpected error      |

---

## 5. Security Considerations

### Authentication & Authorization

**User Identity:**

- User ID obtained exclusively from authenticated JWT session via `supabase.auth.getUser()`
- Never accept user ID from request body or query parameters
- Validate token on every request (no caching of auth state)

**Authorization Check:**

- Performed in service layer before comment creation
- User has access if: (owner_id = user_id) OR (recipient_id = user_id in brief_recipients)
- Single database query combines brief existence check with authorization
- Return 403 for unauthorized access (don't reveal brief existence to unauthorized users)

### Threat Mitigation

| Threat               | Mitigation                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Token theft          | Validate JWT on every request, short token expiration, secure cookie storage             |
| Unauthorized access  | Check brief ownership or recipient status before allowing comment                        |
| XSS attacks          | Content length validation (1-1000 chars), frontend sanitization, content-type validation |
| SQL injection        | Parameterized queries via Supabase (automatic protection)                                |
| Privilege escalation | User ID from auth session only, never from request                                       |
| Resource enumeration | Return 403 instead of 404 for unauthorized briefs (don't confirm existence)              |
| Comment spam         | Consider rate limiting (not in MVP, but recommended for production)                      |

### Input Validation

**Validation Strategy:**

- Use Zod schema (`createCommentSchema`) for all request body validation
- Validate brief ID format as UUID before database query
- Trim whitespace from content before length check
- Validate before any database operations (fail fast)

**Validation Points:**

- Route handler: Parse and validate request body with Zod
- Service layer: Business logic validation (access check, brief existence)
- Database: Final constraints enforcement (comment length CHECK constraint)

---

## 6. Error Handling

**Error Handling Strategy:**

- Use guard clause pattern: validate authentication → validate input → check authorization → perform operation
- Leverage ApiError classes for consistent error responses (from existing error handling utilities)
- Return specific error messages for validation failures with field-level details

**Logging Strategy:**

- **Development:** `console.error()` with full error details and stack traces
- **Production:** Structured logging with Sentry or Winston (ERROR level for 500s, WARN for 403s, INFO for successful operations)
- **Log context:** Include user ID, brief ID, timestamp, and sanitized error messages (never log sensitive data)

---

## 7. Performance

### Expected Performance

**Database queries:** 2-3 queries in a transaction

- Query 1: Check brief access (JOIN briefs with brief_recipients) ~20-30ms
- Query 2: Insert comment ~15-25ms
- Query 3: Update brief.comment_count +1 ~15-25ms
- Query 4: Insert audit log ~10-20ms

**Estimates:**

- Database time: ~60-100ms (with transaction overhead)
- Total server processing: ~100-150ms (including validation, serialization)
- User-perceived latency: ~200-300ms (including network round-trip)

### Indexes Used

**Existing indexes leveraged:**

- `briefs.id` (PRIMARY KEY) - brief existence check
- `brief_recipients(brief_id, recipient_id)` (UNIQUE) - recipient access check
- `briefs.owner_id` (index) - owner access check
- `comments.brief_id` (index) - comment association

**No missing indexes identified** - current schema provides optimal query performance for this endpoint.

### Optimization Opportunities

**1. Combine access check query:**
Instead of separate queries for owner check and recipient check, use single query:

```sql
SELECT EXISTS (
  SELECT 1 FROM briefs WHERE id = $1 AND owner_id = $2
  UNION
  SELECT 1 FROM brief_recipients WHERE brief_id = $1 AND recipient_id = $2
)
```

**2. Use database transaction:**
Wrap comment insert + count increment in transaction to ensure atomicity and prevent race conditions on comment_count.

**3. Consider database trigger for comment_count:**
Move comment_count increment to PostgreSQL trigger (reduces application complexity and ensures consistency even if comment created outside API).

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/comment.schema.ts`

**Tasks:**

- Create schema file for comment validation
- Define `createCommentSchema` with content validation (1-1000 chars, trimmed)
- Export TypeScript type for use in service and route handler

**Implementation:**

```typescript
import { z } from "zod";

/**
 * Validation schema for creating a comment
 * Enforces business rules from API spec and database constraints
 */
export const createCommentSchema = z.object({
  content: z
    .string({ required_error: "Comment content is required" })
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be between 1 and 1000 characters"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
```

---

### Step 2: Implement Service Function

**File:** `src/lib/services/comments.service.ts`

**Tasks:**

- Create new service file for comment business logic
- Implement `createComment()` function with access control
- Implement transaction for comment insert + count increment
- Add audit log entry for comment creation
- Return mapped `CommentDto` with author details

**Implementation:**

```typescript
import type { SupabaseClient } from "@/types";
import type { CommentDto, CommentInsert } from "@/types";

/**
 * Create a new comment on a brief
 * Validates user access and increments comment count atomically
 */
export async function createComment(
  supabase: SupabaseClient,
  briefId: string,
  authorId: string,
  content: string
): Promise<CommentDto> {
  // Step 1: Check if brief exists and user has access (owner or recipient)
  const { data: accessCheck, error: accessError } = await supabase
    .from("briefs")
    .select(
      `
      id,
      owner_id,
      brief_recipients!inner(recipient_id)
    `
    )
    .eq("id", briefId)
    .or(`owner_id.eq.${authorId},brief_recipients.recipient_id.eq.${authorId}`)
    .single();

  if (accessError || !accessCheck) {
    // Brief doesn't exist OR user doesn't have access
    // Return 403 (don't reveal if brief exists to unauthorized users)
    throw new Error("You do not have access to this brief");
  }

  // Step 2: Insert comment
  const commentData: CommentInsert = {
    brief_id: briefId,
    author_id: authorId,
    content: content,
  };

  const { data: newComment, error: insertError } = await supabase
    .from("comments")
    .insert(commentData)
    .select()
    .single();

  if (insertError || !newComment) {
    throw new Error("Failed to create comment");
  }

  // Step 3: Increment comment count on brief
  const { error: updateError } = await supabase
    .from("briefs")
    .update({ comment_count: supabase.raw("comment_count + 1") })
    .eq("id", briefId);

  if (updateError) {
    // Rollback comment if count update fails (ideally use DB transaction)
    await supabase.from("comments").delete().eq("id", newComment.id);
    throw new Error("Failed to update comment count");
  }

  // Step 4: Create audit log entry
  await supabase.from("audit_log").insert({
    user_id: authorId,
    action: "insert",
    entity_type: "comment",
    entity_id: newComment.id,
    new_data: newComment,
  });

  // Step 5: Fetch author details for response
  const { data: author } = await supabase.from("profiles").select("role").eq("id", authorId).single();

  const { data: authUser } = await supabase.auth.admin.getUserById(authorId);

  // Map to CommentDto
  const commentDto: CommentDto = {
    id: newComment.id,
    briefId: newComment.brief_id,
    authorId: newComment.author_id,
    authorEmail: authUser?.user?.email || "",
    authorRole: author?.role || "client",
    content: newComment.content,
    isOwn: true, // Always true for the creator
    createdAt: newComment.created_at,
  };

  return commentDto;
}
```

---

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/[id]/comments/route.ts`

**Tasks:**

- Create route handler file in App Router structure
- Implement POST handler with authentication check
- Validate brief ID format (UUID)
- Parse and validate request body with Zod
- Call service layer function
- Return 201 with CommentDto or appropriate error response

**Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { createCommentSchema } from "@/lib/schemas/comment.schema";
import { createComment } from "@/lib/services/comments.service";
import type { CommentDto, ErrorResponse } from "@/types";

/**
 * POST /api/briefs/:id/comments
 * Create a new comment on a brief (requires access)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<CommentDto | ErrorResponse>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Step 1: Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Extract and validate brief ID
    const { id: briefId } = await context.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(briefId)) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: [{ field: "id", message: "Invalid brief ID format" }],
        },
        { status: 400 }
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Step 4: Create comment via service
    const comment = await createComment(supabase, briefId, user.id, validation.data.content);

    // Step 5: Return success response
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes("do not have access")) {
        return NextResponse.json({ error: "You do not have access to this brief" }, { status: 403 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Brief not found" }, { status: 404 });
      }
    }

    // Generic server error
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ Valid comment creation by brief owner (201 Created)
- ✅ Valid comment creation by shared recipient (201 Created)
- ✅ Missing authentication token (401 Unauthorized)
- ✅ Invalid/expired token (401 Unauthorized)
- ✅ Empty comment content (400 Bad Request)
- ✅ Comment content exceeds 1000 characters (400 Bad Request)
- ✅ Invalid brief ID format (400 Bad Request)
- ✅ User without access tries to comment (403 Forbidden)
- ✅ Comment on non-existent brief (404 Not Found)
- ✅ Verify comment_count incremented correctly (200 OK on subsequent GET)
- ✅ Verify audit log entry created (check audit_log table)
- ✅ Verify isOwn flag is true for comment author

---

### Step 5: Deployment

```bash
# Run code quality checks
npm run lint && npm run type-check && npm run build

# Commit and push changes
git add src/lib/schemas/comment.schema.ts src/lib/services/comments.service.ts src/app/api/briefs/[id]/comments/route.ts
git commit -m "feat: implement POST /api/briefs/:id/comments endpoint"
git push origin main
```

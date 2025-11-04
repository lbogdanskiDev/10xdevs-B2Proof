# DELETE /api/briefs/:id - Delete Brief Implementation Plan

## 1. Endpoint Overview

This endpoint allows creator users to permanently delete their briefs. The operation is restricted to brief owners only and includes comprehensive audit trail logging before deletion. All related records (recipients, comments) are automatically deleted via database cascade rules.

**Purpose:**
- Enable creators to permanently delete briefs they own
- Maintain audit trail for compliance and recovery purposes

**Key Features:**
- Owner-only authorization (strict ownership check)
- Audit trail logging before deletion (captures full brief state)
- Automatic cascade deletion of related records (recipients, comments)
- UUID validation for brief ID
- Returns 204 No Content on success (no response body)

---

## 2. Request Details

**HTTP Method:** DELETE

**URL Structure:** `/api/briefs/:id`

**Headers:**
- `Authorization: Bearer {token}` (Required)

**Parameters:**

**Path Parameters:**
- `id`: UUID string - Brief identifier

**Validation Rules:**
- `id`: Must be valid UUID format (validated via Zod)

**Request Body:** None (DELETE request)

---

## 3. Types Used

**Response DTOs:**
- None (204 No Content response has no body)

**Supporting Types:**
- `ErrorResponse` ([src/types.ts:301-305](src/types.ts#L301-L305)) - Error response structure
- `BriefEntity` ([src/types.ts:44](src/types.ts#L44)) - Internal use for audit logging
- `AuditAction` ([src/types.ts:66](src/types.ts#L66)) - Audit action enum
- `AuditLogInsert` ([src/types.ts:60](src/types.ts#L60)) - Audit log insert type

**Zod Schema (Reuse Existing):**

The UUID validation schema should already exist from GET /api/briefs/:id implementation in `src/lib/schemas/brief.schema.ts`:

```typescript
import { z } from "zod";

export const BriefIdSchema = z.object({
  id: z.string().uuid({ message: "Invalid brief ID format" }),
});

export type BriefIdInput = z.infer<typeof BriefIdSchema>;
```

---

## 4. Response Details

**Success Response (204 No Content):**

No response body. HTTP status 204 indicates successful deletion.

**Error Responses:**

| Status | Error                           | When                                              |
| ------ | ------------------------------- | ------------------------------------------------- |
| 400    | Invalid brief ID format         | Brief ID is not a valid UUID                      |
| 401    | Unauthorized                    | Missing, invalid, or expired Bearer token         |
| 403    | You are not the owner           | User authenticated but is not the brief owner     |
| 404    | Brief not found                 | Valid UUID but brief doesn't exist in database    |
| 500    | Internal server error           | Database failure or unexpected exception          |

---

## 5. Security Considerations

### Authentication & Authorization

**User Identification:**
- Extract user ID from authenticated Supabase session using `supabase.auth.getUser()`
- **NEVER** accept user ID from request parameters, headers, or body
- Validate JWT token automatically through Supabase SDK

**Authorization Checks:**
- Query `briefs` table to verify `owner_id` matches authenticated user ID
- Perform authorization check in service layer before deletion
- Return 403 if user is not the owner
- Return 404 if brief doesn't exist (prevents resource enumeration)

### Threat Mitigation

| Threat                       | Mitigation                                                      |
| ---------------------------- | --------------------------------------------------------------- |
| Token theft                  | HTTPS only, validate token server-side via Supabase SDK         |
| SQL injection                | Use Supabase SDK parameterized queries (no raw SQL)             |
| Privilege escalation         | Always verify ownership from database, never trust client input |
| Authorization bypass         | Extract user ID from authenticated session only                 |
| Accidental deletion          | Audit log captures full state before deletion for recovery      |
| Resource enumeration         | Return 403 for unauthorized access (not 404)                    |

### Input Validation

**Strategy:**
- Validate UUID format using Zod schema before database operations
- Use strict UUID validation (rejects malformed IDs early)
- Validate before authorization check (fail fast on invalid input)

**Validation Timing:**
- Route Handler: Validate path parameter UUID format
- Service Layer: Verify brief existence and ownership
- Database Layer: Handle cascade deletions automatically

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern to handle errors early. All error conditions are checked at the beginning of the service function with early returns. Use custom ApiError classes from `src/lib/errors/api-errors.ts` for consistent error responses. Critical: audit log must succeed before deletion - if audit fails, abort the operation and return 500.

**Logging Strategy:**

- **ERROR level:** Database failures, audit log failures, unexpected exceptions (500 errors)
- **WARN level:** Authorization failures (403 errors), not found errors (404 errors)
- **INFO level:** Successful deletion with user ID and brief ID
- **Development:** Use `console.log` for debugging
- **Production:** Implement structured logging (consider Sentry or Winston for error tracking)

---

## 7. Performance

### Expected Performance

- **Database operations:** ~80-120ms total
  - Brief fetch + ownership check: ~10-20ms (primary key lookup)
  - Audit log insert: ~20-30ms
  - Brief delete with cascades: ~40-60ms (deletes brief + triggers cascade)
- **Total server time:** ~100-150ms (including validation and response)
- **User-perceived time:** ~180-280ms (including network latency)

### Indexes Used

- **briefs.id** (Primary Key) - for brief lookup and deletion
- **briefs.owner_id** - for ownership verification
- **brief_recipients.brief_id** - for cascade deletion (ON DELETE CASCADE)
- **comments.brief_id** - for cascade deletion (ON DELETE CASCADE)
- **audit_log.created_at DESC** - for audit trail queries

### Optimization Opportunities

**Transaction Safety:**
- Wrap audit log + deletion in a single transaction to ensure atomicity
- If audit log fails, deletion should not proceed
- Database cascade rules handle related records efficiently

**Query Optimization:**
- Single query to fetch brief and verify ownership (`SELECT * FROM briefs WHERE id = $1`)
- Check `owner_id` in application layer (avoid extra query)
- Cascade deletions handled automatically by PostgreSQL (no manual cleanup needed)

**Audit Log Strategy:**
- Capture full brief state (including content) in `old_data` for recovery
- Consider async audit log insertion only if performance becomes critical (trade-off: potential audit loss)
- Current synchronous approach preferred for compliance

---

## 8. Implementation Steps

### Step 1: Reuse Existing Zod Schema

**File:** `src/lib/schemas/brief.schema.ts`

**Tasks:**
- Verify `BriefIdSchema` exists (created for GET /api/briefs/:id)
- If not exists, create it with UUID validation

**Implementation:**

```typescript
import { z } from "zod";

export const BriefIdSchema = z.object({
  id: z.string().uuid({ message: "Invalid brief ID format" }),
});

export type BriefIdInput = z.infer<typeof BriefIdSchema>;
```

---

### Step 2: Extend Briefs Service

**File:** `src/lib/services/briefs.service.ts`

**Tasks:**
- Add `deleteBrief` function to existing briefs service
- Implement ownership verification
- Create audit log entry with full brief state
- Delete brief (cascade handles related records)
- Use guard clauses for error handling

**Implementation:**

```typescript
import type { SupabaseClient } from "@/types";
import { ApiError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors/api-errors";

/**
 * Deletes a brief and logs the action to audit trail
 *
 * @throws {UnauthorizedError} If user is not authenticated
 * @throws {ForbiddenError} If user is not the owner
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ApiError} If database operation fails
 */
export async function deleteBrief(
  supabase: SupabaseClient,
  briefId: string,
  userId: string
): Promise<void> {
  // 1. Fetch brief and verify existence
  const { data: brief, error: fetchError } = await supabase
    .from("briefs")
    .select("*")
    .eq("id", briefId)
    .single();

  if (fetchError || !brief) {
    throw new NotFoundError("Brief not found");
  }

  // 2. Verify ownership
  if (brief.owner_id !== userId) {
    throw new ForbiddenError("You are not the owner of this brief");
  }

  // 3. Log audit trail BEFORE deletion (critical for recovery)
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "brief_deleted",
    entity_type: "brief",
    entity_id: brief.id,
    old_data: {
      owner_id: brief.owner_id,
      header: brief.header,
      content: brief.content,
      footer: brief.footer,
      status: brief.status,
      status_changed_at: brief.status_changed_at,
      status_changed_by: brief.status_changed_by,
      comment_count: brief.comment_count,
      created_at: brief.created_at,
      updated_at: brief.updated_at,
    },
  });

  if (auditError) {
    console.error("Failed to log audit trail:", auditError);
    throw new ApiError("Failed to log deletion audit trail", 500);
  }

  // 4. Delete brief (cascade will handle brief_recipients and comments)
  const { error: deleteError } = await supabase
    .from("briefs")
    .delete()
    .eq("id", briefId);

  if (deleteError) {
    console.error("Failed to delete brief:", deleteError);
    throw new ApiError("Failed to delete brief", 500);
  }

  // Success - no return value needed (void)
}
```

---

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/[id]/route.ts`

**Tasks:**
- Add DELETE handler to existing route file (if GET exists) or create new file
- Validate UUID format with Zod
- Authenticate user via Supabase
- Call briefs service
- Return 204 No Content on success

**Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { deleteBrief } from "@/lib/services/briefs.service";
import { BriefIdSchema } from "@/lib/schemas/brief.schema";
import { ApiError, NotFoundError, ForbiddenError } from "@/lib/errors/api-errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate UUID format
    const validationResult = BriefIdSchema.safeParse({ id: params.id });
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return NextResponse.json(
        { error: "Invalid brief ID format", details },
        { status: 400 }
      );
    }

    // 2. Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3. Delete brief
    await deleteBrief(supabase, validationResult.data.id, user.id);

    // 4. Return 204 No Content (no response body)
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    // Handle known API errors
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    // Handle unexpected errors
    console.error("[DELETE /api/briefs/:id] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ Successful deletion by owner (204 No Content)
- ✅ Invalid UUID format (400 Bad Request)
- ✅ Missing Authorization header (401 Unauthorized)
- ✅ Invalid or expired Bearer token (401 Unauthorized)
- ✅ Authenticated but not owner (403 Forbidden)
- ✅ Brief doesn't exist (404 Not Found)
- ✅ Verify cascade deletion (recipients and comments deleted)
- ✅ Verify audit log entry created before deletion

**Manual testing with cURL:**

```bash
# Success case - delete owned brief
curl -X DELETE http://localhost:3000/api/briefs/{brief_id} \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify 204 No Content response (empty body)

# Unauthorized - not owner
curl -X DELETE http://localhost:3000/api/briefs/{brief_id} \
  -H "Authorization: Bearer OTHER_USER_TOKEN"

# Invalid UUID
curl -X DELETE http://localhost:3000/api/briefs/not-a-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"

# Missing token
curl -X DELETE http://localhost:3000/api/briefs/{brief_id}

# Verify audit log
# Query audit_log table to confirm entry with action='brief_deleted'
```

---

### Step 5: Deploy

**Pre-deployment checks:**

```bash
npm run lint && npm run type-check && npm run build
```

**Deployment:**

```bash
git add .
git commit -m "feat: implement DELETE /api/briefs/:id endpoint with audit logging"
git push origin main
```

**Post-deployment verification:**

- Test deletion in production with valid creator token
- Verify 403 response for non-owners
- Verify 404 response for non-existent briefs
- Check `audit_log` table for `brief_deleted` entries with complete `old_data`
- Verify cascade deletion of `brief_recipients` and `comments` records

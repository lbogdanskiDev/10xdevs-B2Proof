# Implementation Plan: Revoke Recipient Access

**Endpoint:** `DELETE /api/briefs/:id/recipients/:recipientId`

---

## 1. Endpoint Overview

This endpoint allows brief owners to revoke access from recipients who were previously granted read/comment access to the brief. When the last recipient is removed, the brief status is automatically reset to 'draft' to reflect that no one has access to it anymore.

**Purpose:**

- Enable brief owners to remove recipient access when collaboration ends
- Automatically reset brief status to 'draft' when last recipient is removed

**Key Features:**

- Owner-only operation (strict authorization)
- Removes recipient record from `brief_recipients` table
- Automatic status reset to 'draft' when last recipient removed
- Complete audit trail for compliance and recovery
- Returns 204 No Content on success (standard for DELETE operations)

---

## 2. Request Details

**HTTP Method:** DELETE

**URL Structure:** `/api/briefs/:id/recipients/:recipientId`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Path Parameters:**

- `id` (UUID) - Brief identifier
- `recipientId` (UUID) - Recipient user identifier to revoke access from

**Request Body:** None

**Validation Rules:**

- Both `id` and `recipientId` must be valid UUIDs
- User must be authenticated (valid JWT token)
- User must be the brief owner
- Recipient access record must exist in `brief_recipients` table

---

## 3. Types Used

**Response DTOs:**

- `ErrorResponse` ([src/types.ts:301-305](src/types.ts#L301-L305)) - Error responses only

**Supporting Types:**

- `SupabaseClient` ([src/types.ts:27](src/types.ts#L27)) - Supabase client type
- `BriefRecipientEntity` ([src/types.ts:49](src/types.ts#L49)) - Database entity type

**Error Classes:**

- `ApiError` ([src/lib/errors/api-errors.ts:5](src/lib/errors/api-errors.ts#L5)) - Base error class
- `UnauthorizedError` ([src/lib/errors/api-errors.ts:24](src/lib/errors/api-errors.ts#L24)) - 401 errors
- `ForbiddenError` ([src/lib/errors/api-errors.ts:34](src/lib/errors/api-errors.ts#L34)) - 403 errors
- `NotFoundError` ([src/lib/errors/api-errors.ts:44](src/lib/errors/api-errors.ts#L44)) - 404 errors

**Zod Schemas:**

Extend existing `BriefIdSchema` to include `recipientId` validation:

```typescript
import { z } from "zod";

export const RevokeRecipientSchema = z.object({
  id: z.string().uuid({ message: "Invalid brief ID format" }),
  recipientId: z.string().uuid({ message: "Invalid recipient ID format" }),
});
```

---

## 4. Response Details

**Success Response:**

**Status:** `204 No Content`

No response body (standard for successful DELETE operations)

**Error Responses:**

| Status | Error                                                 | When                                                  |
| ------ | ----------------------------------------------------- | ----------------------------------------------------- |
| 400    | Invalid brief ID format / Invalid recipient ID format | Path parameters are not valid UUIDs                   |
| 401    | Unauthorized                                          | Missing or invalid authentication token               |
| 403    | Forbidden                                             | User is not the brief owner                           |
| 404    | Not found                                             | Brief doesn't exist or recipient access doesn't exist |
| 500    | Internal server error                                 | Database error or unexpected failure                  |

---

## 5. Security Considerations

### Authentication & Authorization

**User Validation:**

- Validate JWT token using Supabase `getUser()` method
- Extract user ID from authenticated session (NEVER from request parameters)
- Reject requests with missing or invalid tokens (401 Unauthorized)

**Authorization Check:**

- Verify user is the brief owner via database query (`briefs.owner_id = user.id`)
- Perform authorization check in service layer (not in route handler)
- Return 404 (not 403) if brief doesn't exist to prevent resource enumeration

**User ID Source:**

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (!user) throw new UnauthorizedError();
const userId = user.id; // Use this, NEVER req.params.userId
```

### Threat Mitigation

| Threat                 | Mitigation                                                                |
| ---------------------- | ------------------------------------------------------------------------- |
| Token theft            | Validate JWT on every request, use short-lived tokens, HTTPS only         |
| SQL injection          | Use Supabase parameterized queries (automatic protection)                 |
| Privilege escalation   | Verify ownership in service layer, never trust client-provided user IDs   |
| Resource enumeration   | Return 404 for non-existent briefs (don't reveal existence to non-owners) |
| Cascade deletion abuse | Check ownership before deletion, log audit trail for recovery             |
| CSRF attacks           | Use SameSite cookies, verify origin header (Next.js default protection)   |

### Input Validation

**Validation Strategy:**

- Use Zod schemas for type-safe validation before any database operations
- Validate both path parameters (briefId and recipientId as UUIDs)
- Sanitize all user inputs (Zod handles this automatically)

**Validation Points:**

1. **Route Handler:** Validate request structure (Zod schema for path params)
2. **Service Layer:** Validate business rules (ownership, recipient existence)
3. **Database Layer:** Enforce constraints (foreign keys, cascade delete)

**What to Validate:**

- Brief ID format (UUID v4)
- Recipient ID format (UUID v4)
- User authentication (session validity)
- Brief ownership (database query)
- Recipient access existence (database query)

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern with early returns for error conditions. Leverage custom `ApiError` classes for consistent error responses. All errors thrown from service layer bubble up to route handler for centralized error response formatting.

**Logging Strategy:**

- **Development:** Use `console.error()` for debugging with full stack traces
- **Production:** Structured logging with Sentry or Winston (future implementation)
- **Log Levels:**
  - `ERROR` - 500 errors, database failures, unexpected exceptions (log stack trace)
  - `WARN` - 403 Forbidden, audit log failures (log user ID + brief ID + recipient ID)
  - `INFO` - Successful revocations (log user ID, brief ID, recipient ID for audit)

---

## 7. Performance

### Expected Performance

**Estimated Timings:**

- Database queries: ~60-100ms (5-6 queries including transaction)
- Total server processing: ~100-150ms
- User-perceived time: ~150-250ms (including network roundtrip)

### Indexes Used

**Existing Indexes Utilized:**

- `brief_recipients(brief_id, recipient_id)` - UNIQUE index for recipient lookup
- `brief_recipients(brief_id)` - Index for counting remaining recipients
- `briefs(owner_id)` - Index for ownership verification
- Primary key indexes on `briefs(id)`, `brief_recipients(id)`

**No Missing Indexes:**

All necessary indexes exist in the current schema.

### Optimization Opportunities

**Query Optimization:**

- Combine brief existence + ownership check into single query with WHERE clause
- Count remaining recipients before deletion to determine if status reset needed
- Use transaction for atomicity (delete recipient + update status if needed + audit log)

**Future Optimizations:**

- Consider denormalized `recipient_count` field in `briefs` table for faster checks
- Implement async audit logging if audit insertions slow down response time

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/brief.schema.ts`

**Tasks:**

- Create `RevokeRecipientSchema` for path parameter validation
- Validate both `id` (briefId) and `recipientId` as UUIDs

**Implementation:**

```typescript
/**
 * Validation schema for DELETE /api/briefs/:id/recipients/:recipientId path parameters
 */
export const RevokeRecipientSchema = z.object({
  id: z.string().uuid({ message: "Invalid brief ID format" }),
  recipientId: z.string().uuid({ message: "Invalid recipient ID format" }),
});

/**
 * TypeScript type inferred from RevokeRecipientSchema
 */
export type RevokeRecipientInput = z.infer<typeof RevokeRecipientSchema>;
```

---

### Step 2: Implement Service Function

**File:** `src/lib/services/brief.service.ts`

**Tasks:**

- Create `revokeBriefRecipient` function
- Verify brief ownership
- Verify recipient access exists
- Count remaining recipients
- Delete recipient record
- Reset brief status to 'draft' if last recipient removed
- Log audit trail

**Implementation:**

```typescript
/**
 * Revoke recipient access to a brief (owner only)
 *
 * Business Rules:
 * - Only brief owner can revoke access
 * - Recipient access must exist
 * - If last recipient is removed, reset brief status to 'draft'
 * - Audit trail is logged before deletion
 *
 * @param supabase - Authenticated Supabase client
 * @param briefId - UUID of brief
 * @param recipientId - UUID of recipient to revoke access from
 * @param ownerId - UUID of authenticated user (must be brief owner)
 *
 * @throws {NotFoundError} Brief not found or user not owner
 * @throws {NotFoundError} Recipient access not found
 * @throws {DatabaseError} If database operation fails
 */
export async function revokeBriefRecipient(
  supabase: SupabaseClient,
  briefId: string,
  recipientId: string,
  ownerId: string
): Promise<void> {
  // Guard clause: Verify brief exists and user is owner
  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .select("id, owner_id, status")
    .eq("id", briefId)
    .eq("owner_id", ownerId)
    .single();

  if (briefError || !brief) {
    throw new NotFoundError("Brief", briefId);
  }

  // Guard clause: Verify recipient access exists
  const { data: recipientAccess, error: recipientError } = await supabase
    .from("brief_recipients")
    .select("id, brief_id, recipient_id, shared_by, shared_at")
    .eq("brief_id", briefId)
    .eq("recipient_id", recipientId)
    .single();

  if (recipientError || !recipientAccess) {
    throw new NotFoundError("Recipient access", recipientId);
  }

  // Count remaining recipients (before deletion)
  const { count, error: countError } = await supabase
    .from("brief_recipients")
    .select("*", { count: "exact", head: true })
    .eq("brief_id", briefId);

  if (countError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to count recipients:", countError);
    throw new DatabaseError("count recipients");
  }

  const isLastRecipient = count === 1;

  // Log audit trail BEFORE deletion (critical for recovery)
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: ownerId,
    action: "delete",
    entity_type: "brief_recipient",
    entity_id: recipientAccess.id,
    old_data: {
      brief_id: recipientAccess.brief_id,
      recipient_id: recipientAccess.recipient_id,
      shared_by: recipientAccess.shared_by,
      shared_at: recipientAccess.shared_at,
      was_last_recipient: isLastRecipient,
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to log audit trail:", auditError);
    throw new DatabaseError("log audit trail");
  }

  // Delete recipient access
  const { error: deleteError } = await supabase.from("brief_recipients").delete().eq("id", recipientAccess.id);

  if (deleteError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to delete recipient:", deleteError);
    throw new DatabaseError("delete recipient access");
  }

  // If last recipient removed, reset brief status to 'draft'
  if (isLastRecipient && brief.status !== "draft") {
    const { error: updateError } = await supabase
      .from("briefs")
      .update({
        status: "draft",
        status_changed_at: new Date().toISOString(),
        status_changed_by: ownerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId);

    if (updateError) {
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.error("[brief.service] Failed to reset brief status:", updateError);
      // Don't throw - recipient is already deleted, log the error but don't fail
    }
  }

  // eslint-disable-next-line no-console -- Service layer logging for debugging
  console.info(
    `[brief.service] Recipient ${recipientId} access revoked from brief ${briefId} by user ${ownerId}. Last recipient: ${isLastRecipient}`
  );
}
```

---

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/[id]/recipients/[recipientId]/route.ts`

**Tasks:**

- Create DELETE handler
- Validate authentication
- Validate path parameters (briefId and recipientId)
- Call service function
- Handle errors and return appropriate responses
- Return 204 No Content on success

**Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { RevokeRecipientSchema } from "@/lib/schemas/brief.schema";
import { revokeBriefRecipient } from "@/lib/services/brief.service";
import { ApiError, UnauthorizedError } from "@/lib/errors/api-errors";
import type { ErrorResponse } from "@/types";

/**
 * DELETE /api/briefs/:id/recipients/:recipientId
 *
 * Revoke recipient access to brief (owner only)
 *
 * Automatically resets brief status to 'draft' if last recipient is removed.
 *
 * Authentication: Required (Bearer token)
 * Authorization: User must be brief owner
 *
 * Success Response: 204 No Content
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
): Promise<NextResponse<ErrorResponse | void>> {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id, recipientId } = await params;

    // Step 2: Validate path parameters
    const validationResult = RevokeRecipientSchema.safeParse({ id, recipientId });

    // Guard clause: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[DELETE /api/briefs/:id/recipients/:recipientId] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid request parameters", details }, { status: 400 });
    }

    const { id: briefId, recipientId: validRecipientId } = validationResult.data;

    // Step 3: Create Supabase client and validate authentication
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Guard clause: Check authentication
    if (authError || !user) {
      throw new UnauthorizedError();
    }

    // Step 4: Revoke recipient access (service handles all business logic)
    await revokeBriefRecipient(supabase, briefId, validRecipientId, user.id);

    // Happy path: Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[DELETE /api/briefs/:id/recipients/:recipientId] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ Valid revoke request (owner removes recipient) → 204 No Content
- ✅ Remove last recipient (brief status resets to 'draft') → 204 No Content, verify status in database
- ✅ Revoke without authentication → 401 Unauthorized
- ✅ Revoke brief not owned by user → 404 Not Found
- ✅ Revoke non-existent recipient → 404 Not Found
- ✅ Invalid brief ID format → 400 Bad Request
- ✅ Invalid recipient ID format → 400 Bad Request
- ✅ Verify audit log entry created → Check `audit_log` table after revocation

**Example Test Request:**

```bash
curl -X DELETE http://localhost:3000/api/briefs/{briefId}/recipients/{recipientId} \
  -H "Authorization: Bearer {token}"
```

---

### Step 5: Deploy

**Commands:**

```bash
npm run lint && npm run type-check && npm run build
git add . && git commit -m "feat: add revoke recipient access endpoint" && git push
```

---

## Notes

- **Status Reset Logic:** When the last recipient is removed, the brief status is automatically reset to 'draft'. This reflects that the brief is no longer shared with anyone and needs to be re-shared before it can be reviewed again.
- **Audit Trail:** Audit log is created BEFORE deletion (similar to `deleteBrief` function) to ensure recovery is possible. The `was_last_recipient` flag is stored in audit data to track when status was reset.
- **Error Handling:** If status update fails after recipient deletion, the operation doesn't fail entirely (recipient is already deleted). The error is logged but not thrown to avoid inconsistent state.
- **Cascade Deletion:** The database handles cascade deletion of related records (comments, etc.) automatically via foreign key constraints.
- **Future Enhancement:** Consider implementing bulk recipient revocation if UI supports selecting multiple recipients at once.

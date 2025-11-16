# Implementation Plan: Share Brief with Recipient

**Endpoint:** `POST /api/briefs/:id/recipients`

---

## 1. Endpoint Overview

This endpoint allows brief owners to share their briefs with other users by email. Sharing grants the recipient read access to the brief and optionally allows them to comment or change the brief status based on their role.

**Purpose:**

- Enable brief owners to share briefs with clients or collaborators
- Track sharing history with full audit trail (who shared, when, with whom)

**Key Features:**

- Email-based recipient lookup (validates user exists in system)
- Maximum 10 recipients per brief (business rule enforcement)
- Automatic status transition from 'draft' to 'sent' on first share
- Prevents duplicate shares (database-level unique constraint)
- Complete audit trail for compliance and history tracking

---

## 2. Request Details

**HTTP Method:** POST

**URL Structure:** `/api/briefs/:id/recipients`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Path Parameters:**

- `id` (UUID) - Brief identifier to share

**Request Body:**

```json
{
  "email": "client@example.com"
}
```

**Validation Rules:**

- `email`: Required, must be valid email format, user must exist in system (`auth.users`)
- Brief must exist in database
- Authenticated user must be the brief owner
- Brief must have fewer than 10 existing recipients
- Recipient cannot already have access to this brief

---

## 3. Types Used

**Response DTOs:**

- `ShareBriefResponseDto` ([src/types.ts:252-254](src/types.ts#L252-L254)) - Main response type
- `BriefRecipientDto` ([src/types.ts:231-237](src/types.ts#L231-L237)) - Extended by response DTO
- `ErrorResponse` ([src/types.ts:301-305](src/types.ts#L301-L305)) - Error responses

**Command Models:**

- `ShareBriefCommand` ([src/types.ts:241-245](src/types.ts#L241-L245)) - Request body validation

**Supporting Types:**

- `SupabaseClient` ([src/types.ts:27](src/types.ts#L27)) - Supabase client type
- `BriefRecipientInsert` ([src/types.ts:50](src/types.ts#L50)) - Database insert type
- `AuditLogInsert` ([src/types.ts:60](src/types.ts#L60)) - Audit log insert type

**Zod Schemas:**

Create new schema `shareBriefSchema` in `src/lib/schemas/brief.schema.ts`:

```typescript
import { z } from "zod";

export const shareBriefSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .min(1, "Email cannot be empty")
    .max(255, "Email too long"),
});
```

**UUID Validation Schema:**

Reuse existing `uuidSchema` from `src/lib/schemas/brief.schema.ts` for path parameter validation.

---

## 4. Response Details

**Success Response:**

**Status:** `201 Created`

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "briefId": "123e4567-e89b-12d3-a456-426614174001",
  "recipientId": "123e4567-e89b-12d3-a456-426614174002",
  "recipientEmail": "client@example.com",
  "sharedBy": "123e4567-e89b-12d3-a456-426614174003",
  "sharedAt": "2025-01-15T10:35:00.000Z"
}
```

**Error Responses:**

| Status | Error                                            | When                                                    |
| ------ | ------------------------------------------------ | ------------------------------------------------------- |
| 400    | `Invalid request body` or validation errors      | Missing email, invalid email format                     |
| 400    | `User with email 'client@example.com' not found` | Email doesn't exist in `auth.users` table               |
| 401    | `Unauthorized`                                   | Missing or invalid authentication token                 |
| 403    | `You do not have permission to share this brief` | Authenticated user is not the brief owner               |
| 403    | `Maximum of 10 recipients per brief exceeded`    | Brief already has 10 recipients                         |
| 404    | `Brief not found`                                | Brief with specified ID doesn't exist                   |
| 409    | `User already has access to this brief`          | Duplicate share attempt (unique constraint violation)   |
| 500    | `An error occurred while sharing the brief`      | Database transaction failure or unexpected server error |

---

## 5. Security Considerations

### Authentication & Authorization

**User Validation:**

- Validate JWT token using Supabase `getUser()` method
- Extract user ID from authenticated session (NEVER from request parameters)
- Reject requests with missing or invalid tokens (401 Unauthorized)

**Authorization Check:**

- Verify user is the brief owner via database query join (`briefs.owner_id = user.id`)
- Perform authorization check in service layer (not in route handler)
- Return 404 (not 403) if brief doesn't exist to prevent resource enumeration

**User ID Source:**

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (!user) throw new UnauthorizedError();
const userId = user.id; // Use this, NEVER req.body.userId or params.userId
```

### Threat Mitigation

| Threat               | Mitigation                                                                 |
| -------------------- | -------------------------------------------------------------------------- |
| Token theft          | Validate JWT on every request, use short-lived tokens, HTTPS only          |
| SQL injection        | Use Supabase parameterized queries (automatic protection)                  |
| Privilege escalation | Verify ownership in service layer, never trust client-provided user IDs    |
| Resource enumeration | Return 404 for non-existent briefs (don't reveal existence to non-owners)  |
| Email enumeration    | Generic error message for non-existent users (don't reveal user existence) |
| DoS via spam sharing | Rate limiting (future: max shares per minute per user)                     |
| CSRF attacks         | Use SameSite cookies, verify origin header (Next.js default protection)    |

### Input Validation

**Validation Strategy:**

- Use Zod schemas for type-safe validation before any database operations
- Validate path parameters (brief ID as UUID) and request body (email format)
- Sanitize all user inputs (Zod handles this automatically)

**Validation Points:**

1. **Route Handler:** Validate request structure (Zod schema)
2. **Service Layer:** Validate business rules (ownership, recipient limit, duplicate check)
3. **Database Layer:** Enforce constraints (unique, foreign keys, check constraints)

**What to Validate:**

- Email format (RFC 5322 compliant via Zod email validator)
- Brief ID format (UUID v4)
- User authentication (session validity)
- Brief ownership (database query)
- Recipient count (< 10)
- Duplicate shares (try-catch on unique constraint)

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern with early returns for error conditions. Leverage custom `ApiError` classes for consistent error responses across the application. All errors thrown from service layer should bubble up to route handler for centralized error response formatting.

**Logging Strategy:**

- **Development:** Use `console.error()` for debugging with full stack traces
- **Production:** Structured logging with Sentry or Winston (future implementation)
- **Log Levels:**
  - `ERROR` - 500 errors, database failures, unexpected exceptions (log stack trace)
  - `WARN` - 403 Forbidden, 409 Conflict, business rule violations (log user ID + brief ID)
  - `INFO` - Successful shares (log user ID, brief ID, recipient ID for audit)

**Error Flow:**

```
Service throws specific error → Route handler catches → Format to ErrorResponse → Return with appropriate status code
```

---

## 7. Performance

### Expected Performance

**Estimated Timings:**

- Database queries: ~50-100ms (5-6 queries including transaction)
- Total server processing: ~150-200ms
- User-perceived time: ~200-300ms (including network roundtrip)

**Performance Factors:**

- Most time spent in database queries (recipient count, user lookup, transaction)
- Transaction overhead for consistency (insert + status update + audit log)
- Network latency to Supabase (varies by region)

### Indexes Used

**Existing Indexes Utilized:**

- `brief_recipients(brief_id, recipient_id)` - UNIQUE index for duplicate check
- `brief_recipients(brief_id)` - Index for counting recipients
- `briefs(owner_id)` - Index for ownership verification
- Primary key indexes on `briefs(id)`, `auth.users(id)`

**No Missing Indexes:**

All necessary indexes exist in the current schema. The unique constraint on `(brief_id, recipient_id)` provides both duplicate prevention and fast lookups.

### Optimization Opportunities

**Query Optimization:**

- Combine brief existence + ownership check into single query with WHERE clause
- Use transaction for atomicity (insert recipient + update status + audit log)
- Consider adding `auth.users(email)` index if email lookups become frequent (currently acceptable without)

**Potential Future Optimizations:**

- Cache recipient counts in `briefs` table (denormalized field) if count queries become bottleneck
- Batch share operations if UI supports selecting multiple recipients at once
- Implement async audit logging if audit insertions slow down response time

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/brief.schema.ts`

**Tasks:**

- Import Zod library
- Create `shareBriefSchema` for email validation
- Export schema for use in route handler

**Implementation:**

```typescript
import { z } from "zod";

// ... existing schemas ...

/**
 * Schema for sharing a brief with a recipient
 * Used in: POST /api/briefs/:id/recipients
 */
export const shareBriefSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .min(1, "Email cannot be empty")
    .max(255, "Email too long"),
});

/**
 * UUID validation schema for path parameters
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");
```

---

### Step 2: Implement Service Function

**File:** `src/lib/services/brief.service.ts`

**Tasks:**

- Create `shareBriefWithRecipient` function
- Validate brief ownership
- Check recipient limit (max 10)
- Lookup recipient by email
- Handle duplicate share attempts
- Update brief status to 'sent' if currently 'draft'
- Insert audit log entry
- Return recipient details

**Implementation:**

```typescript
import type { SupabaseClient, ShareBriefResponseDto } from "@/types";

/**
 * Share a brief with a recipient by email
 *
 * @throws {NotFoundError} Brief not found or user not owner
 * @throws {BadRequestError} User with email not found
 * @throws {ForbiddenError} Recipient limit exceeded (max 10)
 * @throws {ConflictError} User already has access to brief
 */
export async function shareBriefWithRecipient(
  supabase: SupabaseClient,
  briefId: string,
  recipientEmail: string,
  ownerId: string
): Promise<ShareBriefResponseDto> {
  // Step 1: Verify brief exists and user is owner
  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .select("id, owner_id, status")
    .eq("id", briefId)
    .eq("owner_id", ownerId)
    .single();

  if (briefError || !brief) {
    throw new NotFoundError("Brief not found");
  }

  // Step 2: Check recipient limit (max 10)
  const { count, error: countError } = await supabase
    .from("brief_recipients")
    .select("*", { count: "exact", head: true })
    .eq("brief_id", briefId);

  if (countError) {
    throw new Error("Failed to check recipient count");
  }

  if (count !== null && count >= 10) {
    throw new ForbiddenError("Maximum of 10 recipients per brief exceeded");
  }

  // Step 3: Lookup recipient user by email
  const { data: recipientUser, error: userError } = await supabase.rpc("get_user_by_email", {
    email_param: recipientEmail,
  });

  if (userError || !recipientUser || recipientUser.length === 0) {
    throw new BadRequestError(`User with email '${recipientEmail}' not found`);
  }

  const recipientId = recipientUser[0].id;

  // Step 4: Check for duplicate share
  const { data: existingRecipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .eq("recipient_id", recipientId)
    .single();

  if (existingRecipient) {
    throw new ConflictError("User already has access to this brief");
  }

  // Step 5: Insert recipient and update brief status in transaction
  const { data: newRecipient, error: insertError } = await supabase
    .from("brief_recipients")
    .insert({
      brief_id: briefId,
      recipient_id: recipientId,
      shared_by: ownerId,
    })
    .select(
      `
      id,
      brief_id,
      recipient_id,
      shared_by,
      shared_at,
      recipient:recipient_id (
        email:auth.users(email)
      )
    `
    )
    .single();

  if (insertError) {
    throw new Error("Failed to share brief");
  }

  // Step 6: Update brief status to 'sent' if currently 'draft'
  if (brief.status === "draft") {
    const { error: updateError } = await supabase
      .from("briefs")
      .update({
        status: "sent",
        status_changed_at: new Date().toISOString(),
        status_changed_by: ownerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId);

    if (updateError) {
      // Log error but don't fail the entire operation
      console.error("Failed to update brief status:", updateError);
    }
  }

  // Step 7: Insert audit log
  await supabase.from("audit_log").insert({
    user_id: ownerId,
    action: "create",
    entity_type: "brief_recipient",
    entity_id: newRecipient.id,
    new_data: newRecipient,
  });

  // Step 8: Return recipient details
  return {
    id: newRecipient.id,
    briefId: newRecipient.brief_id,
    recipientId: newRecipient.recipient_id,
    recipientEmail: recipientEmail,
    sharedBy: newRecipient.shared_by,
    sharedAt: newRecipient.shared_at,
  };
}
```

---

### Step 3: Create Database RPC Function (Optional Helper)

**File:** Create migration in `supabase/migrations/`

**Tasks:**

- Create PostgreSQL function to lookup user by email
- Enables service layer to query `auth.users` table safely

**Implementation:**

```sql
-- Create function to lookup user by email
-- This is needed because auth.users is not directly accessible via Supabase client
CREATE OR REPLACE FUNCTION get_user_by_email(email_param TEXT)
RETURNS TABLE (id UUID, email TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  WHERE au.email = email_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;
```

---

### Step 4: Implement Route Handler

**File:** `src/app/api/briefs/[id]/recipients/route.ts`

**Tasks:**

- Create POST handler
- Validate authentication
- Parse and validate request body
- Validate path parameter (brief ID)
- Call service function
- Handle errors and return appropriate responses

**Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { shareBriefSchema, uuidSchema } from "@/lib/schemas/brief.schema";
import { shareBriefWithRecipient } from "@/lib/services/brief.service";
import type { ShareBriefResponseDto, ErrorResponse } from "@/types";

/**
 * POST /api/briefs/:id/recipients
 * Share brief with recipient by email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ShareBriefResponseDto | ErrorResponse>> {
  try {
    // Step 1: Validate authentication
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Validate path parameter (brief ID)
    const briefIdValidation = uuidSchema.safeParse(params.id);
    if (!briefIdValidation.success) {
      return NextResponse.json({ error: "Invalid brief ID format" }, { status: 400 });
    }

    const briefId = briefIdValidation.data;

    // Step 3: Parse and validate request body
    const body = await request.json();
    const validation = shareBriefSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Step 4: Share brief with recipient
    const result = await shareBriefWithRecipient(supabase, briefId, email, user.id);

    // Step 5: Return success response
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Handle known errors
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    // Handle unexpected errors
    console.error("Error sharing brief:", error);
    return NextResponse.json({ error: "An error occurred while sharing the brief" }, { status: 500 });
  }
}

// Custom error classes
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
```

---

### Step 5: Testing

**File:** Manual testing with HTTP client (Postman, curl, or Thunder Client)

**Test scenarios:**

- ✅ Valid share request (owner shares with existing user) → 201 Created
- ✅ Share with non-existent email → 400 Bad Request
- ✅ Share without authentication → 401 Unauthorized
- ✅ Share brief not owned by user → 404 Not Found
- ✅ Share with 10th recipient → 201 Created
- ✅ Share with 11th recipient → 403 Forbidden (limit exceeded)
- ✅ Share with same user twice → 409 Conflict
- ✅ Share non-existent brief → 404 Not Found
- ✅ Invalid email format → 400 Bad Request
- ✅ Invalid brief ID format → 400 Bad Request
- ✅ Brief status changes from 'draft' to 'sent' on first share → Verify in database

**Example Test Request:**

```bash
curl -X POST http://localhost:3000/api/briefs/{briefId}/recipients \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"email": "client@example.com"}'
```

---

### Step 6: Deploy

**Commands:**

```bash
npm run lint && npm run type-check && npm run build
git add . && git commit -m "feat: add share brief with recipient endpoint" && git push
```

---

## Notes

- **Database RPC Function:** The `get_user_by_email` function is required because `auth.users` table is not directly accessible via Supabase client queries. Create this function via migration before implementing the service.
- **Transaction Handling:** Consider wrapping recipient insert + status update + audit log in a Supabase RPC function for atomic transaction if consistency is critical.
- **Rate Limiting:** Future enhancement should add rate limiting to prevent spam sharing (e.g., max 20 shares per minute per user).
- **Email Notifications:** Future enhancement could send email notifications to recipients when briefs are shared with them.
- **Audit Log:** Audit logging is fire-and-forget (async) to avoid blocking the response. Log failures are logged to console but don't fail the operation.

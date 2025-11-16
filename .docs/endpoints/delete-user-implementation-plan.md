# Implementation Plan: DELETE /api/users/me

## 1. Endpoint Overview

This endpoint permanently deletes the authenticated user's account and all associated data from the system. The deletion cascades through the database schema automatically via foreign key constraints, removing all user-owned briefs, comments, and shared brief relationships.

**Purpose:**

- Allow users to permanently delete their account and all personal data (GDPR compliance)

**Key Features:**

- Requires authentication (only the user can delete their own account)
- Hard delete (permanent, non-recoverable)
- Cascading deletion of all related entities (briefs, comments, recipients)
- Audit trail created before deletion
- Returns 204 No Content on success

---

## 2. Request Details

**HTTP Method:** DELETE

**URL Structure:** `/api/users/me`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Parameters:**

- None (user ID derived from authenticated session)

**Request Body:**

- None

---

## 3. Types Used

**Response DTOs:**

- None (204 No Content has no body)
- Error responses: `ErrorResponse` ([src/types.ts:301-305](src/types.ts#L301-L305))

**Command Models:**

- None (no request body)

**Supporting Types:**

- `SupabaseClient` ([src/types.ts:27](src/types.ts#L27))
- `AuditAction` enum ([src/types.ts:66](src/types.ts#L66))
- `AuditLogInsert` ([src/types.ts:60](src/types.ts#L60))

**Zod Schemas:**
No new schemas needed (authentication-only endpoint).

---

## 4. Response Details

**Success Response:**

**204 No Content**

```
(empty body)
```

**Error Responses:**

| Status | Error                 | When                                        |
| ------ | --------------------- | ------------------------------------------- |
| 401    | Unauthorized          | Missing, invalid, or expired token          |
| 404    | User not found        | Account already deleted or doesn't exist    |
| 500    | Internal server error | Database error during deletion or audit log |

---

## 5. Security Considerations

#### Authentication & Authorization

- Validate user via Supabase session (JWT from Authorization header)
- Extract user ID from `supabase.auth.getUser()` - NEVER from request params
- User can only delete their own account (inherent with /me endpoint)
- No additional authorization checks needed (user owns their account)

#### Threat Mitigation

| Threat                | Mitigation                                                       |
| --------------------- | ---------------------------------------------------------------- |
| Token theft           | Validate JWT signature, expiration, and issuer via Supabase      |
| Account takeover      | User ID derived from authenticated session only                  |
| Data recovery attacks | Hard delete (not soft delete), no recovery mechanism             |
| Audit trail loss      | Create audit log entry BEFORE deletion                           |
| Cascade failure       | Database foreign key constraints ensure atomic cascading deletes |
| Privilege escalation  | No admin bypass - users can only delete own account              |

#### Input Validation

- Validate authentication token via Supabase (automatic)
- Verify user exists before attempting deletion (404 if not found)
- No request body validation needed (no body expected)

---

## 6. Error Handling

**Error Handling Strategy:**
Use guard clause pattern with early returns for error conditions. Log critical errors (500s) with full context, warnings (404s) for missing resources, and info for successful deletions. All errors return standardized `ErrorResponse` format.

**Logging Strategy:**

- **ERROR level:** Database failures (500), unexpected exceptions
- **WARN level:** User not found (404), already deleted
- **INFO level:** Successful account deletion (audit log serves as permanent record)
- Development: `console.error/warn/log`
- Production: Structured logging (e.g., Sentry for errors, Winston for audit trail)

---

## 7. Performance

#### Expected Performance

- Database query time: ~50-150ms (delete + cascades)
- Total server time: ~100-200ms (auth + audit log + delete)
- User-perceived time: ~150-300ms (network + processing)

#### Indexes Used

- Primary key index on `auth.users.id` (delete lookup)
- Foreign key indexes on:
  - `profiles.id` → `auth.users.id`
  - `briefs.owner_id` → `auth.users.id`
  - `comments.author_id` → `auth.users.id`
  - `brief_recipients.recipient_id` → `auth.users.id`
  - `brief_recipients.shared_by` → `auth.users.id`

**Missing Indexes:** None (all foreign keys are indexed by default)

#### Optimization Opportunities

- Audit log insert is independent - could be fire-and-forget async (but risky for GDPR compliance)
- Consider batch deletion job for large accounts (if user has 1000+ briefs)
- Database cascading deletes are already optimized (single transaction)

---

## 8. Implementation Steps

### Step 1: Create User Service

**File:** `src/lib/services/user.service.ts`

**Tasks:**

- Create new service file for user account operations
- Implement `deleteUserAccount` function
- Handle audit logging before deletion
- Use Supabase Admin API to delete from auth.users table

**Implementation:**

```typescript
import type { SupabaseClient } from "@/types";

/**
 * Delete user account and all associated data
 *
 * Cascading deletes (via database FK constraints):
 * - profiles
 * - briefs (owned)
 * - comments (authored)
 * - brief_recipients (as recipient or sharer)
 * - audit_log entries (user_id set to NULL)
 *
 * @throws Error if deletion fails
 */
export async function deleteUserAccount(supabase: SupabaseClient, userId: string): Promise<void> {
  // Fetch user data for audit log before deletion
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("User not found");
  }

  // Get email from auth.users via admin API
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(userId);

  if (userError || !user) {
    throw new Error("User not found in auth system");
  }

  // Create audit log entry BEFORE deletion
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "delete",
    entity_type: "user",
    entity_id: userId,
    old_data: {
      id: profile.id,
      role: profile.role,
      email: user.email,
      created_at: profile.created_at,
    },
    new_data: null,
  });

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
    throw new Error("Failed to log account deletion");
  }

  // Delete user from auth.users (cascades to all related tables)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("Failed to delete user:", deleteError);
    throw new Error("Failed to delete user account");
  }

  console.log(`User account deleted: ${userId}`);
}
```

---

### Step 2: Implement Route Handler

**File:** `src/app/api/users/me/route.ts`

**Tasks:**

- Create DELETE handler function
- Authenticate user via Supabase session
- Call `deleteUserAccount` service function
- Return 204 No Content on success
- Handle errors with appropriate status codes

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { deleteUserAccount } from "@/lib/services/user.service";
import type { ErrorResponse } from "@/types";

export async function DELETE(): Promise<NextResponse<ErrorResponse | void>> {
  const supabase = await createSupabaseServerClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ErrorResponse>({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete user account and all associated data
  try {
    await deleteUserAccount(supabase, user.id);
  } catch (error) {
    console.error("Error deleting user account:", error);

    // Check if user not found
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json<ErrorResponse>({ error: "User not found" }, { status: 404 });
    }

    // Generic server error
    return NextResponse.json<ErrorResponse>({ error: "Failed to delete account" }, { status: 500 });
  }

  // Return 204 No Content (no response body)
  return new NextResponse(null, { status: 204 });
}
```

---

### Step 3: Testing

**File:** Manual testing via API client (Postman, curl, etc.)

**Test scenarios:**

- ✅ Successful account deletion (204 No Content)
- ✅ Missing Authorization header (401 Unauthorized)
- ✅ Invalid JWT token (401 Unauthorized)
- ✅ Expired JWT token (401 Unauthorized)
- ✅ Already deleted user (404 User not found)
- ✅ Verify cascading deletes (briefs, comments, recipients deleted)
- ✅ Verify audit log entry created with correct old_data

**Example test commands:**

```bash
# Success case
curl -X DELETE http://localhost:3000/api/users/me \
  -H "Authorization: Bearer {valid_token}"

# Missing auth header
curl -X DELETE http://localhost:3000/api/users/me

# Invalid token
curl -X DELETE http://localhost:3000/api/users/me \
  -H "Authorization: Bearer invalid_token"
```

---

### Step 4: Deploy

```bash
npm run lint && npm run type-check && npm run build
git add . && git commit -m "feat: implement DELETE /api/users/me endpoint" && git push
```

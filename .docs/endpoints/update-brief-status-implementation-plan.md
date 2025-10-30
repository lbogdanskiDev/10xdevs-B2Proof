# Update Brief Status Endpoint - Implementation Plan

## 1. Endpoint Overview

This endpoint allows clients with access to update brief status (accept, reject, request modification). Status updates to 'needs_modification' automatically create an associated comment.

**Purpose:**

- Enable clients to respond to sent briefs with status updates
- Provide feedback mechanism through status changes
- Optional comment for modification requests

**Key Features:**

- Client-only operation (recipients, not owners)
- Brief must be in 'sent' state
- Conditional comment creation for 'needs_modification' status
- Transactional integrity for status updates with comments
- Access control validation (must be recipient)

---

## 2. Request Details

**HTTP Method:** PATCH

**URL Structure:** `/api/briefs/:id/status`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Path Parameters:**

- `id`: UUID - Brief identifier

**Request Body:**

```json
{
  "status": "needs_modification",
  "comment": "Please add more details about the timeline"
}
```

**Validation Rules:**

- `status`: Required, enum: 'accepted' | 'rejected' | 'needs_modification'
- `comment`: Required if status is 'needs_modification', string, 1-1000 characters
- Brief must be in 'sent' state
- User must be a recipient (not owner)

---

## 3. Types Used

**Response DTOs:**

- `UpdateBriefStatusWithCommentResponseDto` ([src/types.ts](src/types.ts)) - Status fields with optional comment

**Command Models:**

- `UpdateBriefStatusCommand` ([src/types.ts](src/types.ts)) - Client status updates

**Supporting Types:**

- `BriefStatus` ([src/types.ts](src/types.ts)) - Enum for status values
- `CommentDto` ([src/types.ts](src/types.ts)) - Comment details when status is 'needs_modification'

**Zod Schema:**

```typescript
export const updateBriefStatusSchema = z
  .object({
    status: z.enum(["accepted", "rejected", "needs_modification"], {
      errorMap: () => ({ message: "Status must be 'accepted', 'rejected', or 'needs_modification'" }),
    }),
    comment: z.string().min(1, "Comment cannot be empty").max(1000, "Comment must not exceed 1000 characters").optional(),
  })
  .refine(
    (data) => {
      if (data.status === "needs_modification") {
        return data.comment !== undefined && data.comment.length > 0;
      }
      return true;
    },
    {
      message: "Comment is required when status is 'needs_modification'",
      path: ["comment"],
    }
  );
```

---

## 4. Response Formats

### Success Response (200 OK)

**For status update (accepted/rejected):**

```json
{
  "id": "uuid",
  "status": "accepted",
  "statusChangedAt": "2025-01-15T10:30:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 3,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**For status update with comment (needs_modification):**

```json
{
  "id": "uuid",
  "status": "needs_modification",
  "statusChangedAt": "2025-01-15T10:30:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 4,
  "updatedAt": "2025-01-15T10:30:00Z",
  "comment": {
    "id": "uuid",
    "briefId": "uuid",
    "authorId": "uuid",
    "authorEmail": "client@example.com",
    "authorRole": "client",
    "content": "Please add more details about the timeline",
    "isOwn": true,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### Error Responses

**400 Bad Request** - Validation error:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "comment",
      "message": "Comment is required when status is 'needs_modification'"
    }
  ]
}
```

**403 Forbidden** - User is owner, brief not in 'sent' state, or status is 'accepted':

```json
{
  "error": "Brief owners cannot update status directly"
}
```

```json
{
  "error": "Brief status can only be changed when it is in 'sent' state"
}
```

```json
{
  "error": "Cannot change status from accepted"
}
```

**404 Not Found** - Brief doesn't exist:

```json
{
  "error": "Brief with ID {id} not found"
}
```

---

## 5. Implementation Steps

### Step 1: Types (✅ Completed)

1. **Create `UpdateBriefStatusCommand`** in `src/types.ts`:
   - `status`: BriefStatus ('accepted' | 'rejected' | 'needs_modification')
   - `comment`: Optional string

2. **Create `UpdateBriefStatusWithCommentResponseDto`** in `src/types.ts`:
   - Extends `BriefStatusResponseDto`
   - Adds `comment?: CommentDto`
   - Adds `commentCount: number`
   - Adds `updatedAt: string`

### Step 2: Validation Schema (✅ Completed)

1. **Create `updateBriefStatusSchema`** in `src/lib/schemas/brief.schema.ts`:
   - Validate status enum values
   - Validate comment length (1-1000 chars)
   - Refine: comment required when status is 'needs_modification'

### Step 3: Service Layer (✅ Completed)

1. **Function `updateBriefStatus()`** in `src/lib/services/brief.service.ts`:
   ```typescript
   async function updateBriefStatus(
     supabase: SupabaseClient,
     userId: string,
     briefId: string,
     data: UpdateBriefStatusCommand
   ): Promise<UpdateBriefStatusWithCommentResponseDto>
   ```

   **Logic:**
   - Check user has access using **shared helper** `checkBriefAccess()` from `brief.service.ts`
   - Throw `NotFoundError` if brief not found
   - Throw `ForbiddenError` if user is owner
   - Throw `ForbiddenError` if brief status is not 'sent' (must be in 'sent' state)
   - Throw `ForbiddenError` if brief status is 'accepted' (cannot change from accepted status - see API Plan line 548)
   - Update brief status with `status_changed_at` and `status_changed_by`
   - If status is 'needs_modification':
     - Create comment using **shared helper** `createCommentForStatusUpdate()` from `brief.service.ts`
     - Include comment in response
   - Return status update response

2. **Shared helper `checkBriefAccess()`** (exported from `src/lib/services/brief.service.ts`):
   - Already implemented and exported
   - Check if user is owner or recipient
   - Return `{ isOwner: boolean, brief: { owner_id, status } | null }`

3. **Shared helper `createCommentForStatusUpdate()`** (exported from `src/lib/services/brief.service.ts`):
   - Already implemented and exported
   - Insert comment with brief_id, author_id, content
   - Fetch author email and role
   - Return `CommentDto`

### Step 4: Route Handler (✅ Completed)

1. **Create `PATCH` handler** in `src/app/api/briefs/[id]/status/route.ts`:

   **Steps:**
   - Await params (Next.js 15)
   - Validate UUID with `BriefIdSchema`
   - Parse request body
   - Validate body with `updateBriefStatusSchema`
   - Get Supabase client and user ID (mock: `DEFAULT_USER_PROFILE.id`)
   - Call `updateBriefStatus()` service
   - Return success response (200)
   - Handle errors:
     - `NotFoundError` → 404
     - `ForbiddenError` → 403
     - `ValidationError` → 400
     - `ApiError` → Use error.statusCode
     - Unexpected → 500

---

## 6. Business Rules & Validation

### Access Control

- ✅ User must be authenticated
- ✅ User must have access to brief (be a recipient)
- ✅ User cannot be the brief owner (owners use content update endpoint)

### Status Constraints

- ✅ Brief must be in 'sent' state
- ✅ Cannot change status from 'accepted' (accepted status is final - see API Plan line 548)
- ✅ Status can only be changed to: 'accepted', 'rejected', 'needs_modification'
- ✅ Comment is required for 'needs_modification'

### Data Integrity

- ✅ Status update is atomic with comment creation
- ✅ `status_changed_at` and `status_changed_by` are set
- ✅ `comment_count` is automatically incremented by database trigger

---

## 7. Database Operations

### Update Brief Status

```sql
UPDATE briefs
SET
  status = $1,
  status_changed_at = NOW(),
  status_changed_by = $2,
  updated_at = NOW()
WHERE id = $3
RETURNING *;
```

### Insert Comment (if needs_modification)

```sql
INSERT INTO comments (brief_id, author_id, content)
VALUES ($1, $2, $3)
RETURNING *;
```

**Note:** The `increment_comment_count` trigger automatically updates `briefs.comment_count`.

---

## 8. Error Handling

### Service Layer Errors

- `NotFoundError(404)` - Brief not found
- `ForbiddenError(403)` - User is owner or brief not in 'sent' state
- `ApiError(500)` - Database operation failed

### Route Handler Errors

- 400 - Invalid UUID or validation failed
- 403 - Access denied or forbidden operation
- 404 - Brief not found
- 500 - Unexpected server error

**Error Response Structure:**

```typescript
{
  error: string;
  details?: Array<{ field: string; message: string }>;
}
```

---

## 9. Testing Scenarios

### Happy Paths

1. ✅ Client accepts brief (status: 'accepted')
2. ✅ Client rejects brief (status: 'rejected')
3. ✅ Client requests modification with comment (status: 'needs_modification')

### Error Cases

1. ✅ Invalid UUID format → 400
2. ✅ Brief not found → 404
3. ✅ Owner tries to update status → 403
4. ✅ Non-recipient tries to update → 403
5. ✅ Brief not in 'sent' state (e.g., 'draft') → 403
6. ✅ Brief status is 'accepted' (cannot change from accepted) → 403
7. ✅ 'needs_modification' without comment → 400
8. ✅ Comment exceeds 1000 characters → 400
9. ✅ Invalid status value → 400

---

## 10. Implementation Checklist

- [x] Types: `UpdateBriefStatusCommand`, `UpdateBriefStatusWithCommentResponseDto`
- [x] Schema: `updateBriefStatusSchema` with comment validation
- [x] Service: `updateBriefStatus()` function
- [x] Service: `checkBriefAccess()` helper
- [x] Service: `createCommentForStatusUpdate()` helper
- [x] Route: `PATCH /api/briefs/:id/status` handler
- [x] Error handling: All error types covered
- [x] Validation: UUID, status enum, comment requirement
- [ ] Tests: Unit tests for service functions
- [ ] Tests: Integration tests for route handler
- [ ] Documentation: API docs updated

---

## 11. Related Files

**Implementation:**
- `src/app/api/briefs/[id]/status/route.ts` - Route handler
- `src/lib/services/brief.service.ts` - Business logic
- `src/lib/schemas/brief.schema.ts` - Validation
- `src/types.ts` - Type definitions

**Database:**
- `briefs` table - Status update
- `comments` table - Comment creation
- `increment_comment_count` trigger - Auto-increment

**Related Endpoints:**
- `PATCH /api/briefs/:id` - Owner content updates (see [update-brief-implementation-plan.md](.docs/endpoints/update-brief-implementation-plan.md))
- `GET /api/briefs/:id` - View brief details (see [get-brief-by-id-implementation-plan.md](.docs/endpoints/get-brief-by-id-implementation-plan.md))
- `GET /api/briefs/:id/comments` - List all comments

**Note:** This endpoint (`PATCH /api/briefs/:id/status`) is dedicated to status updates by clients. For content updates by owners, use `PATCH /api/briefs/:id`.

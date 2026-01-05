# Update Brief Endpoint - Implementation Plan

## 1. Endpoint Overview

This endpoint allows brief owners to update content (header, content, footer). Owner content updates automatically reset status to 'draft' via database trigger.

**Purpose:**

- Enable owners to modify brief content throughout the draft lifecycle

**Key Features:**

- Owner-only operation (content updates)
- Automatic status reset to 'draft' when content is modified (database trigger)
- Access control validation (must be owner)

---

## 2. Request Details

**HTTP Method:** PATCH

**URL Structure:** `/api/briefs/:id`

**Headers:**

- `Authorization: Bearer {token}` (required)

**Path Parameters:**

- `id`: UUID - Brief identifier

**Request Body:**

```json
{
  "header": "Updated Title",
  "content": {
    /* Updated TipTap JSON */
  },
  "footer": "Updated footer"
}
```

**Validation Rules:**

- `header`: Optional, string, 1-200 characters
- `content`: Optional, valid TipTap JSON structure (JSONB)
- `footer`: Optional, string, max 200 characters or null
- At least one field must be provided

---

## 3. Types Used

**Response DTOs:**

- `BriefDetailDto` ([src/types.ts:134-139](src/types.ts#L134-L139)) - Full brief with content for owner updates

**Command Models:**

- `UpdateBriefCommand` ([src/types.ts:168-172](src/types.ts#L168-L172)) - Owner content updates

**Supporting Types:**

- `BriefEntity` ([src/types.ts:44](src/types.ts#L44)) - Database entity type

**Zod Schema:**

```typescript
import { z } from "zod";

// Helper function to count text length in TipTap JSON content
function countTipTapTextLength(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  let length = 0;
  const nodeObj = node as Record<string, unknown>;
  if (nodeObj.type === "text" && typeof nodeObj.text === "string") {
    length += nodeObj.text.length;
  }
  if (Array.isArray(nodeObj.content)) {
    for (const child of nodeObj.content) {
      length += countTipTapTextLength(child);
    }
  }
  return length;
}

export const updateBriefContentSchema = z
  .object({
    header: z
      .string()
      .trim()
      .min(1, "Header cannot be empty")
      .max(200, "Header must not exceed 200 characters")
      .optional(),
    content: z
      .record(z.unknown())
      .refine((val) => typeof val === "object" && val !== null, {
        message: "Content must be a valid TipTap JSON object",
      })
      .refine(
        (val) => {
          const textLength = countTipTapTextLength(val);
          return textLength <= 10000;
        },
        {
          message: "Content must not exceed 10,000 characters",
        }
      )
      .optional(),
    footer: z
      .string()
      .trim()
      .min(1, "Footer cannot be empty")
      .max(200, "Footer must not exceed 200 characters")
      .nullable()
      .optional(),
  })
  .refine((data) => data.header !== undefined || data.content !== undefined || data.footer !== undefined, {
    message: "At least one field (header, content, or footer) must be provided",
  });
```

**Note:**

- The `countTipTapTextLength()` function enforces the 10,000 character limit for TipTap content (see tech-stack.md line 57)
- `.trim()` is applied to `header` and `footer` to prevent empty strings after whitespace removal
- `.min(1)` ensures that after trimming, the fields are not empty strings

---

## 4. Response Details

**Success Response (200 OK):**

```json
{
  "id": "uuid",
  "ownerId": "uuid",
  "header": "Updated Title",
  "content": {
    /* Updated TipTap JSON */
  },
  "footer": "Updated footer",
  "status": "draft", // Status automatically reset to 'draft' by database trigger 'reset_status_on_brief_edit' (see db-plan.md line 254-267)
  "statusChangedAt": "2025-01-15T11:00:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 3,
  "isOwned": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

**Error Responses:**

| Status | Error                       | When                                          |
| ------ | --------------------------- | --------------------------------------------- |
| 400    | Validation failed           | Invalid request body, missing required fields |
| 400    | At least one field required | Empty request body                            |
| 401    | Unauthorized                | Missing or invalid authentication token       |
| 403    | Forbidden                   | User is not the brief owner                   |
| 404    | Brief not found             | Brief with specified ID does not exist        |
| 500    | Internal server error       | Database error or unexpected error            |

---

## 5. Security Considerations

#### Authentication & Authorization

**User Validation:**

- Extract user ID from Supabase session via `createSupabaseServerClient()`
- Never trust user ID from request parameters or body
- Verify user exists and has valid session

**Authorization Checks (in service layer):**

- Verify user is the brief owner (check `briefs.owner_id`)
- Only brief owners can update content (header, content, footer)

#### Threat Mitigation

| Threat                 | Mitigation                                                                      |
| ---------------------- | ------------------------------------------------------------------------------- |
| Token theft/replay     | Validate JWT signature and expiration via Supabase Auth                         |
| Privilege escalation   | Enforce ownership check: only owners can update content                         |
| Unauthorized access    | Check ownership via `briefs.owner_id`                                           |
| XSS via TipTap content | Sanitize content on frontend render (TipTap handles this), store as JSONB       |
| SQL injection          | Use Supabase parameterized queries, validate UUIDs with Zod                     |
| Resource enumeration   | Return 404 for both non-existent and unauthorized briefs (don't leak existence) |

#### Input Validation

**Validation Strategy:**

- Use Zod schemas to validate all request inputs before database operations
- Validate UUID format for path parameter `id`
- Validate string lengths for `header`, `footer`
- Validate TipTap content structure (JSONB format)

**Validation Timing:**

- Parse and validate request body immediately in route handler
- Validate user permissions in service layer before database operations

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern with early returns to handle error conditions at the beginning of functions. Leverage custom `ApiError` classes from `src/lib/errors/api-errors.ts` for consistent error responses. All service functions should throw typed errors that are caught and converted to proper HTTP responses in the route handler.

**Logging Strategy:**

- **Development:** Use `console.error` for debugging with full error stack traces
- **Production:** Implement structured logging (e.g., Sentry, Winston) with error context (user ID, brief ID, action)
- **Log Levels:**
  - ERROR: 500 errors, database failures, unexpected exceptions
  - WARN: 403 authorization failures, 404 not found
  - INFO: Successful updates (content or status changes)

---

## 7. Performance

#### Expected Performance

- **Database query time:** 50-100ms (single brief lookup + update, or update + comment insert)
- **Total server time:** 100-200ms (includes auth, validation, business logic)
- **User-perceived time:** 200-400ms (includes network latency)

#### Indexes Used

**Existing indexes leveraged:**

- `briefs.id` (PRIMARY KEY) - Brief lookup
- `briefs.owner_id` - Ownership verification
- `brief_recipients(brief_id, recipient_id)` (UNIQUE) - Access verification
- `comments.brief_id` - Comment count increment

**No missing indexes identified** - All queries use primary keys or existing foreign key indexes.

#### Optimization Opportunities

**Caching strategy (future consideration):**

- Cache brief ownership checks in Redis (TTL: 5 minutes) for frequently accessed briefs
- Invalidate cache on ownership transfer or brief deletion

---

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** [src/lib/schemas/brief.schema.ts](src/lib/schemas/brief.schema.ts)

**Tasks:**

- Add `updateBriefContentSchema` for owner content updates

**Implementation:**

```typescript
import { z } from "zod";

/**
 * Validation schema for updating brief content (owner only)
 */
export const updateBriefContentSchema = z
  .object({
    header: z.string().min(1, "Header cannot be empty").max(200, "Header must not exceed 200 characters").optional(),
    content: z.record(z.unknown()).optional(), // TipTap JSON structure
    footer: z
      .string()
      .min(1, "Footer cannot be empty")
      .max(200, "Footer must not exceed 200 characters")
      .nullable()
      .optional(),
  })
  .refine((data) => data.header !== undefined || data.content !== undefined || data.footer !== undefined, {
    message: "At least one field (header, content, or footer) must be provided",
  });
```

---

### Step 2: Service Layer (✅ Completed)

**File:** [src/lib/services/brief.service.ts](src/lib/services/brief.service.ts)

**Note:** The `updateBriefContent()` function is already implemented in the service layer.

**Function signature:**

```typescript
export async function updateBriefContent(
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  data: UpdateBriefCommand
): Promise<BriefDetailDto>;
```

**Logic:**

- Uses shared helper `checkBriefAccess()` to verify ownership
- Throws `NotFoundError` if brief not found
- Throws `ForbiddenError` if user is not the owner
- Updates only provided fields (header, content, footer)
- Returns full `BriefDetailDto` with updated content

---

### Step 3: Route Handler (✅ Completed)

**File:** [src/app/api/briefs/[id]/route.ts](src/app/api/briefs/[id]/route.ts)

**Tasks:**

- Add PATCH handler function for content updates
- Validate request body
- Call `updateBriefContent()` service function
- Handle errors and return appropriate responses

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors/api-errors";
import { updateBriefContentSchema } from "@/lib/schemas/brief.schema";
import { updateBriefContent } from "@/lib/services/brief.service";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const briefId = uuidSchema.parse(id);

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateBriefContentSchema.parse(body);

    // Update brief content
    const updatedBrief = await updateBriefContent(supabase, user.id, briefId, validatedData);
    return NextResponse.json(updatedBrief, { status: 200 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle custom API errors
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Handle unexpected errors
    console.error("Unexpected error in PATCH /api/briefs/:id:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ Update header only (200 OK)
- ✅ Update content only (200 OK)
- ✅ Update footer only (200 OK)
- ✅ Update all fields (200 OK)
- ✅ Update with null footer (200 OK)
- ✅ Verify status automatically resets to 'draft' (200 OK)
- ✅ Empty request body (400 Bad Request)
- ✅ Header exceeds 200 characters (400 Bad Request)
- ✅ Footer exceeds 200 characters (400 Bad Request)
- ✅ Non-owner tries to update content (403 Forbidden)
- ✅ Invalid brief ID (404 Not Found)
- ✅ Missing authentication token (401 Unauthorized)

---

### Step 5: Deploy

```bash
npm run lint && npm run type-check && npm run build
git add . && git commit -m "feat: implement PATCH /api/briefs/:id endpoint" && git push
```

## 10. Related Endpoints

**Status Updates:**

- `PATCH /api/briefs/:id/status` - Client status updates (see [update-brief-status-implementation-plan.md](.docs/endpoints/update-brief-status-implementation-plan.md))

**Viewing Briefs:**

- `GET /api/briefs/:id` - View brief details (see [get-brief-by-id-implementation-plan.md](.docs/endpoints/get-brief-by-id-implementation-plan.md))
- `GET /api/briefs` - List all briefs (see [get-briefs-implementation-plan.md](.docs/endpoints/get-briefs-implementation-plan.md))

**Note:** This endpoint (`PATCH /api/briefs/:id`) is dedicated to content updates by owners. For status updates by clients, use `PATCH /api/briefs/:id/status`.

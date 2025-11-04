# POST /api/briefs - Create Brief Implementation Plan

## 1. Endpoint Overview

This endpoint allows creator users to create new project briefs with rich text content. The endpoint enforces role-based access control (creators only) and business rules (maximum 20 briefs per creator). All created briefs start in 'draft' status and include audit trail logging.

**Purpose:**
- Enable creators to store project briefs with structured rich text content
- Enforce business constraints and authorization rules at the API layer

**Key Features:**
- Role-based access control (creators only)
- TipTap JSON content support for rich text editing
- Business rule enforcement (20 brief limit per creator)
- Audit trail logging for compliance
- Returns complete brief details including ownership flag

---

## 2. Request Details

**HTTP Method:** POST

**URL Structure:** `/api/briefs`

**Headers:**
- `Authorization: Bearer {token}` (Required)
- `Content-Type: application/json` (Required)

**Request Body:**

```json
{
  "header": "Project Brief Title",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Brief content"
          }
        ]
      }
    ]
  },
  "footer": "Optional footer text"
}
```

**Validation Rules:**
- `header`: Required, string, must be trimmed, 1-200 characters after trimming
- `content`: Required, must be valid JSON object (TipTap document structure)
- `footer`: Optional, string or null, max 200 characters if provided

---

## 3. Types Used

**Response DTOs:**
- `BriefDetailDto` ([src/types.ts:134-139](src/types.ts#L134-L139)) - Full brief details with content

**Command Models:**
- `CreateBriefCommand` ([src/types.ts:157-161](src/types.ts#L157-L161)) - Request body structure

**Supporting Types:**
- `BriefStatus` ([src/types.ts:65](src/types.ts#L65)) - Brief status enum
- `BriefInsert` ([src/types.ts:45](src/types.ts#L45)) - Database insert type
- `UserRole` ([src/types.ts:64](src/types.ts#L64)) - User role enum
- `AuditAction` ([src/types.ts:66](src/types.ts#L66)) - Audit action enum

**Zod Schema (New):**

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

const createBriefSchema = z.object({
  header: z
    .string()
    .trim()
    .min(1, "Header is required")
    .max(200, "Header must be 200 characters or less"),
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
    ),
  footer: z
    .string()
    .max(200, "Footer must be 200 characters or less")
    .optional()
    .nullable(),
});
```

**Note:** The `countTipTapTextLength()` function recursively traverses the TipTap document tree and counts all text node characters, enforcing the 10,000 character limit as per PRD requirements (see tech-stack.md line 57).

---

## 4. Response Details

**Success Response (201 Created):**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "ownerId": "123e4567-e89b-12d3-a456-426614174001",
  "header": "Project Brief Title",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Brief content"
          }
        ]
      }
    ]
  },
  "footer": "Optional footer text",
  "status": "draft",
  "statusChangedAt": null,
  "statusChangedBy": null,
  "commentCount": 0,
  "isOwned": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**

| Status | Error                 | When                                                                 |
| ------ | --------------------- | -------------------------------------------------------------------- |
| 400    | Validation failed     | Invalid request body (header length, missing content, invalid JSON) |
| 401    | Unauthorized          | Missing, invalid, or expired Bearer token                            |
| 403    | Forbidden (role)      | User role is 'client' instead of 'creator'                           |
| 403    | Forbidden (limit)     | Creator has reached the 20 brief limit                               |
| 500    | Internal server error | Database connection failure, unexpected errors                       |

---

## 5. Security Considerations

### Authentication & Authorization

**User Identification:**
- Extract user ID from authenticated Supabase session using `supabase.auth.getUser()`
- **NEVER** accept user ID from request parameters, headers, or body
- Validate JWT token automatically through Supabase SDK

**Authorization Checks:**
- Query `profiles` table to verify user role is 'creator'
- Perform authorization in service layer before any database mutations
- Return 403 if user role is 'client'

### Threat Mitigation

| Threat                 | Mitigation                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| Token theft            | Use HTTPS only, validate token server-side via Supabase SDK          |
| SQL injection          | Use Supabase SDK parameterized queries (no raw SQL)                  |
| XSS attacks            | Store TipTap content as JSONB; sanitize when rendering on frontend   |
| Privilege escalation   | Always verify role from database, never trust client-provided claims |
| Resource exhaustion    | Enforce 20 brief limit per creator in service layer                  |
| Authorization bypass   | Extract user ID from authenticated session only                      |

### Input Validation

**Strategy:**
- Validate all inputs using Zod schema before calling service layer
- Use strict validation rules matching database constraints
- Trim whitespace from string inputs (header, footer)
- Validate content is a valid JSON object (TipTap structure)

**Validation Timing:**
- Route Handler: Validate request body structure and data types
- Service Layer: Enforce business rules (brief limit, role check)
- Database Layer: Final constraint checks (handled by PostgreSQL)

---

## 6. Error Handling

**Error Handling Strategy:**

Use guard clause pattern to handle errors early. All error conditions are checked at the beginning of the service function with early returns. Use custom ApiError classes from `src/lib/errors/` for consistent error responses. All database errors are caught and logged with appropriate context.

**Logging Strategy:**

- **ERROR level:** Database failures, unexpected exceptions (500 errors)
- **WARN level:** Authorization failures, business rule violations (403 errors)
- **INFO level:** Successful brief creation with user ID and brief ID
- **Development:** Use `console.log` for debugging
- **Production:** Implement structured logging (consider Sentry or Winston for error tracking)

---

## 7. Performance

### Expected Performance

- **Database operations:** ~60-100ms total
  - Profile role check: ~5-10ms (primary key lookup)
  - Brief count query: ~10-20ms (indexed on owner_id)
  - Brief insert: ~20-30ms
  - Audit log insert: ~20-30ms
- **Total server time:** ~80-120ms (including validation and response mapping)
- **User-perceived time:** ~150-250ms (including network latency)

### Indexes Used

- **profiles.id** (Primary Key) - for role verification
- **briefs.owner_id** - for counting user's briefs (enforcing 20 limit)
- **audit_log.created_at DESC** - for audit trail queries (not used in this endpoint but benefits overall system)

### Optimization Opportunities

**Query Optimization:**
- Combine role check and brief count into a single query using CTE (Common Table Expression)
- Example: `WITH user_profile AS (SELECT role FROM profiles WHERE id = $1)`

**Async Processing:**
- Move audit log insertion to background job/queue (fire-and-forget pattern)
- Reduces critical path latency by ~20-30ms
- Trade-off: Audit entries may be delayed by a few seconds

**Caching:**
- Cache user role in JWT claims during authentication to avoid profile lookup
- Requires custom JWT claim injection in Supabase Auth hooks

---

## 8. Implementation Steps

### Step 1: Create Briefs Service

**File:** `src/lib/services/briefs.service.ts`

**Tasks:**
- Create new service file for brief-related business logic
- Implement `createBrief` function with role check, limit enforcement, and audit logging
- Map database entity to BriefDetailDto response

**Implementation:**

```typescript
import type { SupabaseClient } from "@/types";
import type { CreateBriefCommand, BriefDetailDto, BriefEntity } from "@/types";
import { ApiError, ForbiddenError, UnauthorizedError } from "@/lib/errors/api-errors";

/**
 * Creates a new brief for a creator user
 *
 * @throws {UnauthorizedError} If user is not authenticated
 * @throws {ForbiddenError} If user is not a creator or has reached the 20 brief limit
 * @throws {ApiError} If database operation fails
 */
export async function createBrief(
  supabase: SupabaseClient,
  userId: string,
  data: CreateBriefCommand
): Promise<BriefDetailDto> {
  // 1. Verify user role is 'creator'
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new UnauthorizedError("User profile not found");
  }

  if (profile.role !== "creator") {
    throw new ForbiddenError("Only creators can create briefs");
  }

  // 2. Check brief count limit (max 20)
  // NOTE: Using select('id') instead of select('*') for better performance
  // We only need the count, not the actual data
  const { count, error: countError } = await supabase
    .from("briefs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (countError) {
    throw new ApiError("Failed to check brief limit", 500);
  }

  if (count !== null && count >= 20) {
    throw new ForbiddenError(
      "Brief limit of 20 reached. Please delete old briefs to create new ones."
    );
  }

  // 3. Insert brief
  const { data: brief, error: insertError } = await supabase
    .from("briefs")
    .insert({
      owner_id: userId,
      header: data.header,
      content: data.content,
      footer: data.footer ?? null,
      status: "draft",
      comment_count: 0,
    })
    .select()
    .single();

  if (insertError || !brief) {
    throw new ApiError("Failed to create brief", 500);
  }

  // 4. Log audit trail
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "brief_created",
    entity_type: "brief",
    entity_id: brief.id,
    new_data: {
      header: brief.header,
      content: brief.content,
      footer: brief.footer,
      status: brief.status,
    },
  });

  if (auditError) {
    console.error("Failed to log audit trail:", auditError);
    // Don't throw - audit log failure shouldn't break the operation
  }

  // 5. Map to DTO
  return mapBriefEntityToDetailDto(brief, true);
}

/**
 * Maps BriefEntity to BriefDetailDto
 */
function mapBriefEntityToDetailDto(
  brief: BriefEntity,
  isOwned: boolean
): BriefDetailDto {
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
    isOwned,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
}
```

---

### Step 2: Create API Error Classes

**File:** `src/lib/errors/api-errors.ts`

**Tasks:**
- Create custom error classes for consistent API error responses
- Export UnauthorizedError, ForbiddenError, ValidationError, ApiError

**Implementation:**

```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = "Validation failed", details?: unknown) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}
```

---

### Step 3: Create Route Handler

**File:** `src/app/api/briefs/route.ts`

**Tasks:**
- Implement POST handler with Zod validation
- Extract user from authenticated session
- Call briefs service
- Handle errors and return appropriate responses

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { createBrief } from "@/lib/services/briefs.service";
import { ApiError, ValidationError } from "@/lib/errors/api-errors";
import type { CreateBriefCommand } from "@/types";

// Validation schema
const createBriefSchema = z.object({
  header: z
    .string()
    .trim()
    .min(1, "Header is required")
    .max(200, "Header must be 200 characters or less"),
  content: z
    .record(z.unknown())
    .refine((val) => typeof val === "object" && val !== null, {
      message: "Content must be a valid TipTap JSON object",
    }),
  footer: z
    .string()
    .max(200, "Footer must be 200 characters or less")
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    // 1. Parse request body
    const body = await request.json();

    // 2. Validate input
    const validationResult = createBriefSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details },
        { status: 400 }
      );
    }

    const data: CreateBriefCommand = validationResult.data;

    // 3. Get authenticated user
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

    // 4. Create brief
    const brief = await createBrief(supabase, user.id, data);

    // 5. Return success response
    return NextResponse.json(brief, { status: 201 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }

    // Handle unexpected errors
    console.error("Unexpected error in POST /api/briefs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

### Step 4: Testing

**Test scenarios:**

- ✅ **201 Created:** Valid request with all fields from authenticated creator
- ✅ **201 Created:** Valid request without optional footer field
- ✅ **400 Bad Request:** Missing required header field
- ✅ **400 Bad Request:** Header exceeds 200 characters
- ✅ **400 Bad Request:** Header is empty string or only whitespace
- ✅ **400 Bad Request:** Footer exceeds 200 characters
- ✅ **400 Bad Request:** Content is not a valid JSON object
- ✅ **401 Unauthorized:** Missing Authorization header
- ✅ **401 Unauthorized:** Invalid or expired Bearer token
- ✅ **403 Forbidden:** User role is 'client' instead of 'creator'
- ✅ **403 Forbidden:** Creator has already created 20 briefs

**Manual Testing with cURL:**

```bash
# Success case
curl -X POST http://localhost:3000/api/briefs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "header": "Test Brief",
    "content": {"type": "doc", "content": []},
    "footer": "Test footer"
  }'

# Validation error - missing header
curl -X POST http://localhost:3000/api/briefs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": {"type": "doc", "content": []}}'

# Unauthorized
curl -X POST http://localhost:3000/api/briefs \
  -H "Content-Type: application/json" \
  -d '{"header": "Test", "content": {}}'
```

---

### Step 5: Deploy

**Pre-deployment checks:**

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Build for production
npm run build
```

**Deployment:**

```bash
# Commit changes
git add .
git commit -m "feat: implement POST /api/briefs endpoint"

# Push to remote
git push origin main
```

**Post-deployment verification:**

- Test endpoint in production environment with valid creator token
- Verify 403 response for client users
- Verify 20 brief limit enforcement
- Check audit_log table for brief_created entries

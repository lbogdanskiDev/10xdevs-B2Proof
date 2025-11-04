# API Endpoint Implementation Plan: Get Briefs List

## 1. Endpoint Overview

The `GET /api/briefs` endpoint retrieves a paginated list of briefs that the authenticated user has access to. This includes briefs they own (created) and briefs that have been shared with them by other users.

**Purpose:**
- Provide authenticated access to user's briefs collection
- Support pagination for efficient data loading
- Enable filtering by ownership (owned vs. shared)
- Enable filtering by brief status
- Return summary view without full content for performance

**Key Features:**
- JWT-based authentication via Supabase Auth
- Flexible filtering (ownership and status)
- Pagination with configurable page size
- Optimized query performance with proper indexing
- Type-safe response with BriefListItemDto

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/briefs?page={page}&limit={limit}&filter={filter}&status={status}
```

### Headers
**Required:**
- `Authorization: Bearer {jwt_token}` - Supabase JWT token

### Parameters

**Query Parameters:**

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `page` | Number | No | 1 | Integer ≥ 1 | Page number for pagination |
| `limit` | Number | No | 10 | Integer 1-50 | Number of items per page |
| `filter` | String | No | - | "owned" \| "shared" | Filter by ownership type |
| `status` | String | No | - | Valid BriefStatus | Filter by brief status |

**Valid Status Values:**
`"draft"`, `"sent"`, `"accepted"`, `"rejected"`, `"needs_modification"`

## 3. Types Used

**Response DTO:** `PaginatedResponse<BriefListItemDto>` - See [src/types.ts](src/types.ts)
**Query Params:** `BriefQueryParams` - See [src/types.ts:163-168](src/types.ts#L163-L168)
**Supporting Types:** `BriefStatus`, `PaginationMetadata`, `ErrorResponse` - See [src/types.ts](src/types.ts)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ownerId": "660e8400-e29b-41d4-a716-446655440001",
      "header": "Website Redesign Project",
      "footer": "Contact: john@example.com",
      "status": "sent",
      "commentCount": 3,
      "isOwned": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-20T14:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Error Responses

| Status | Error | When |
|--------|-------|------|
| 400 | Invalid query parameters | Page < 1, limit not in 1-50, invalid filter/status |
| 401 | Unauthorized | No Authorization header or malformed |
| 401 | Invalid or expired token | JWT token invalid, expired, or cannot be verified |
| 500 | Internal server error | Database failure or unexpected exception |

## 5. Authorization

**Access Control:**
- User can see briefs they own (`briefs.owner_id = userId`)
- User can see briefs shared with them (`brief_recipients.recipient_id = userId`)
- No risk of horizontal privilege escalation (user ID from session)

**Implementation:**
- Authorization logic in service layer via query filtering
- No explicit 403 responses (empty result set if no access)

## 6. Security Considerations

### Authentication & Authorization
- Use `supabase.auth.getUser()` for server-side token validation
- User ID from session only (never from request params)
- Queries filter by ownership/sharing automatically

### Threat Mitigation

| Threat | Mitigation |
|--------|-----------|
| Token theft | HTTPS only, httpOnly cookies |
| Token expiration | Return 401, client refreshes token |
| SQL injection | Supabase SDK parameterized queries |
| XSS attacks | Next.js auto-escaping, CSP headers |
| Horizontal privilege escalation | User ID from session, explicit WHERE clauses |
| Performance DoS | Rate limiting (100 req/min), max page size (50) |

### Input Validation
- Use Zod for query parameter validation
- Coerce strings to numbers for page/limit
- Validate enums for filter/status
- Validate before database query

## 7. Error Handling

**Error Handling Strategy:**
- Use guard clauses for early returns on validation and authentication failures
- Throw descriptive errors from service layer for database failures
- Return appropriate HTTP status codes and error details via NextResponse
- Use Zod error formatting for validation errors

**Logging Strategy:**
- Development: `console.error()` with full error context (user ID, query params, error stack)
- Production: structured logging to error tracking service (Sentry)
- Log levels:
  - ERROR: 500 errors, database failures, unexpected exceptions
  - WARN: 400 errors (invalid params), 401 errors (expired tokens)
  - INFO: successful requests with query stats (optional for analytics)

## 8. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/brief.schema.ts`

```typescript
import { z } from 'zod'

export const BriefQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  filter: z.enum(['owned', 'shared']).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'needs_modification']).optional()
})

export type BriefQueryInput = z.infer<typeof BriefQuerySchema>
```

### Step 2: Create Brief Service

**File:** `src/lib/services/brief.service.ts`

**Implementation:**
1. Build query based on filter (owned/shared/all)
2. Apply status filter if provided
3. Apply pagination with `range()`
4. Get total count with `{ count: 'exact' }`
5. Transform BriefEntity to BriefListItemDto
6. Calculate `isOwned` flag for each brief
7. Calculate pagination metadata
8. Return `PaginatedResponse<BriefListItemDto>`

**Function signature:**
```typescript
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>>
```

**Query construction:**
```typescript
// For owned briefs
query = query.eq('owner_id', userId)

// For shared briefs
const { data: sharedBriefIds } = await supabase
  .from('brief_recipients')
  .select('brief_id')
  .eq('recipient_id', userId)

query = query.in('id', briefIds).neq('owner_id', userId)

// Apply pagination
const offset = (page - 1) * limit
query = query
  .order('updated_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/route.ts`

**Implementation flow:**
1. Authenticate user with `supabase.auth.getUser()` (401 if failed)
2. Parse and validate query parameters with Zod (400 if invalid)
3. Call `getBriefs()` service
4. Return success response with paginated data (200)

**Error handling:**
```typescript
try {
  // Authenticate, validate, fetch
} catch (error) {
  console.error('[GET /api/briefs] Error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

**Configuration:**
```typescript
export const dynamic = 'force-dynamic'
```

### Step 4: Testing

**Manual testing with curl:**
```bash
# Get owned briefs
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/briefs?filter=owned"

# Get shared briefs with pagination
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/briefs?filter=shared&page=1&limit=5"

# Get briefs with status filter
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/briefs?status=sent"

# Test validation error
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/briefs?limit=100"
```

**Test scenarios:**
- ✅ Get all briefs
- ✅ Pagination (different page/limit)
- ✅ Filter by ownership (owned, shared)
- ✅ Filter by status
- ✅ Invalid query params (400)
- ✅ Missing token (401)
- ✅ Invalid token (401)

### Step 5: Deploy

**Pre-deployment:**
```bash
npm run lint
npm run type-check
npm run build
```

**Commit and deploy:**
```bash
git add .
git commit -m "feat(api): implement GET /api/briefs endpoint with pagination and filtering"
git push origin main
```

**Monitoring:**
- Configure error tracking (Sentry)
- Set up performance monitoring
- Alert on error rates > 1%
- Alert on response times > 1s

## 9. Performance

**Expected Performance:**
- Target response time: < 300ms (p95)

**Indexes:**
- `briefs(owner_id, updated_at DESC)` - Owned briefs with ordering
- `briefs(status, updated_at DESC)` - Status filtering
- `brief_recipients(recipient_id)` - Shared briefs lookup
- `brief_recipients(brief_id, recipient_id)` UNIQUE - Prevents duplicates

**Optimization:**
- Exclude `content` field from list view (reduces payload size by ~95%)
- Use denormalized `comment_count` (no JOIN needed)
- Single query for count and data (combined in Supabase)
- Consider adding composite index: `briefs(owner_id, status, updated_at DESC)` for filtered queries

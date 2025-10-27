# API Endpoint Implementation Plan: Get Briefs List

## 1. Endpoint Overview

The `GET /api/briefs` endpoint retrieves a paginated list of briefs that the authenticated user has access to. This includes briefs they own (created) and briefs that have been shared with them by other users. The endpoint is fundamental for displaying the main briefs list view in the application.

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
- `Authorization: Bearer {jwt_token}` - Supabase JWT token obtained during authentication

**Example:**
```http
GET /api/briefs?page=1&limit=10&filter=owned&status=sent HTTP/1.1
Host: b2proof.com/api
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Parameters

**Query Parameters:**

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `page` | Number | No | 1 | Integer ≥ 1 | Page number for pagination |
| `limit` | Number | No | 10 | Integer 1-50 | Number of items per page |
| `filter` | String | No | - | "owned" \| "shared" | Filter by ownership type |
| `status` | String | No | - | Valid BriefStatus | Filter by brief status |

**Valid Status Values:**
- `"draft"` - Brief is being edited
- `"sent"` - Brief has been sent to client
- `"accepted"` - Brief accepted by client
- `"rejected"` - Brief rejected by client
- `"needs_modification"` - Client requested changes

**Example Query Strings:**
```
?page=1&limit=20
?filter=owned&status=sent
?filter=shared&page=2&limit=15
?status=draft
```

**Path Parameters:** None

**Request Body:** None (GET request)

## 3. Types Used

### Response DTOs

**BriefListItemDto** (defined in [src/types.ts:134-145](src/types.ts#L134-L145))
```typescript
export interface BriefListItemDto {
  id: string                    // UUID of the brief
  ownerId: string               // UUID of the brief owner
  header: string                // Brief title (max 200 chars)
  footer: string | null         // Optional footer text
  status: BriefStatus           // Current status
  commentCount: number          // Number of comments
  isOwned: boolean              // Whether current user owns this brief
  createdAt: string             // ISO 8601 timestamp
  updatedAt: string             // ISO 8601 timestamp
}
```

**PaginatedResponse<BriefListItemDto>** (defined in [src/types.ts:103-106](src/types.ts#L103-L106))
```typescript
export interface PaginatedResponse<T> {
  data: T[]                     // Array of briefs
  pagination: PaginationMetadata
}
```

**PaginationMetadata** (defined in [src/types.ts:93-98](src/types.ts#L93-L98))
```typescript
export interface PaginationMetadata {
  page: number                  // Current page number
  limit: number                 // Items per page
  total: number                 // Total number of items
  totalPages: number            // Total number of pages
}
```

### Query Parameters

**BriefQueryParams** (defined in [src/types.ts:163-168](src/types.ts#L163-L168))
```typescript
export interface BriefQueryParams {
  page?: number
  limit?: number
  filter?: "owned" | "shared"
  status?: BriefStatus
}
```

### Supporting Types

**BriefStatus** (defined in [src/types.ts:65](src/types.ts#L65))
```typescript
export type BriefStatus = Enums<'brief_status'>
// "draft" | "sent" | "accepted" | "rejected" | "needs_modification"
```

**ErrorResponse** (defined in [src/types.ts:300-304](src/types.ts#L300-L304))
```typescript
export interface ErrorResponse {
  error: string
  details?: ValidationErrorDetail[]
  retryAfter?: number
}
```

**ValidationErrorDetail** (defined in [src/types.ts:292-295](src/types.ts#L292-L295))
```typescript
export interface ValidationErrorDetail {
  field: string
  message: string
}
```

### Database Entities

**BriefEntity** (defined in [src/types.ts:44](src/types.ts#L44))
```typescript
export type BriefEntity = Tables<'briefs'>
// Maps to briefs table with all fields
```

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**
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
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "ownerId": "660e8400-e29b-41d4-a716-446655440003",
      "header": "Mobile App Development",
      "footer": null,
      "status": "needs_modification",
      "commentCount": 7,
      "isOwned": false,
      "createdAt": "2025-01-18T09:00:00.000Z",
      "updatedAt": "2025-01-21T16:30:00.000Z"
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

**Field Descriptions:**

*BriefListItemDto fields:*
- `id`: UUID string identifying the brief
- `ownerId`: UUID of the user who created the brief
- `header`: Brief title/header (1-200 characters)
- `footer`: Optional footer text (max 200 characters), can be null
- `status`: Current brief status enum value
- `commentCount`: Total number of comments on this brief (≥ 0)
- `isOwned`: Boolean indicating if the current user is the owner (true) or it was shared with them (false)
- `createdAt`: ISO 8601 timestamp when brief was created
- `updatedAt`: ISO 8601 timestamp when brief was last modified

*PaginationMetadata fields:*
- `page`: Current page number (matches request parameter)
- `limit`: Number of items per page (matches request parameter)
- `total`: Total number of briefs matching the filters
- `totalPages`: Calculated value (Math.ceil(total / limit))

**Empty Result:**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Query Parameters

**Triggers:**
- Page number less than 1
- Limit less than 1 or greater than 50
- Filter value not "owned" or "shared"
- Status value not a valid BriefStatus enum

**Response:**
```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 50"
    }
  ]
}
```

**Example Validation Errors:**
```json
// Invalid page
{
  "error": "Invalid query parameters",
  "details": [
    { "field": "page", "message": "Page must be at least 1" }
  ]
}

// Invalid filter
{
  "error": "Invalid query parameters",
  "details": [
    { "field": "filter", "message": "Filter must be either 'owned' or 'shared'" }
  ]
}

// Invalid status
{
  "error": "Invalid query parameters",
  "details": [
    { "field": "status", "message": "Invalid enum value. Expected 'draft' | 'sent' | 'accepted' | 'rejected' | 'needs_modification'" }
  ]
}
```

#### 401 Unauthorized - Missing Token

```json
{
  "error": "Unauthorized"
}
```
**When:** No Authorization header provided or header is malformed

#### 401 Unauthorized - Invalid/Expired Token

```json
{
  "error": "Invalid or expired token"
}
```
**When:** JWT token is invalid, expired, or cannot be verified

#### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```
**When:** Database connection failure, Supabase service error, or unexpected exception

## 5. Data Flow

### High-Level Flow

```
Client Request
    ↓
[Route Handler] /api/briefs/route.ts
    ↓
Authenticate via Supabase Auth
    ↓
Validate Query Parameters (Zod)
    ↓
Extract User ID from Session
    ↓
[Brief Service] src/lib/services/brief.service.ts
    ↓
Build Query Based on Filters
    ↓
Execute Paginated Query
    ↓
Get Total Count
    ↓
Transform to BriefListItemDto[]
    ↓
Calculate Pagination Metadata
    ↓
Return PaginatedResponse
```

### Detailed Flow

#### 1. Request Reception
- Next.js Route Handler receives GET request
- Extract Authorization header from request
- Parse query string parameters

#### 2. Authentication
- Create Supabase server client using `await createSupabaseServerClient()` from `src/db/supabase.server.ts`
- Call `supabase.auth.getUser()` to verify JWT token and get user session
- If authentication fails, return 401 with appropriate error message

#### 3. Input Validation
- Parse query parameters with Zod schema
- Validate page (≥1, integer)
- Validate limit (1-50, integer)
- Validate filter ("owned" | "shared" | undefined)
- Validate status (valid BriefStatus enum | undefined)
- If validation fails, return 400 with detailed error information

#### 4. User Identification
- Extract user ID from authenticated session: `user.id`
- Pass user ID and validated parameters to Brief Service

#### 5. Query Construction (in Brief Service)

**No Filter (All Briefs):**
```typescript
// Get owned briefs
const ownedQuery = supabase
  .from('briefs')
  .select('*', { count: 'exact' })
  .eq('owner_id', userId)

// Get shared briefs via join
const sharedQuery = supabase
  .from('brief_recipients')
  .select('briefs(*)', { count: 'exact' })
  .eq('recipient_id', userId)

// Combine results
```

**Filter = "owned":**
```typescript
const query = supabase
  .from('briefs')
  .select('*', { count: 'exact' })
  .eq('owner_id', userId)
```

**Filter = "shared":**
```typescript
const query = supabase
  .from('brief_recipients')
  .select('briefs(*)', { count: 'exact' })
  .eq('recipient_id', userId)
  .neq('briefs.owner_id', userId) // Exclude briefs user owns
```

**Apply Status Filter (if provided):**
```typescript
if (status) {
  query = query.eq('status', status)
}
```

**Apply Pagination:**
```typescript
const offset = (page - 1) * limit
query = query
  .order('updated_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

#### 6. Data Retrieval
- Execute query to get briefs
- Capture total count from query result
- Handle database errors

#### 7. Data Transformation

For each brief entity, transform to BriefListItemDto:
```typescript
{
  id: brief.id,
  ownerId: brief.owner_id,
  header: brief.header,
  footer: brief.footer,
  status: brief.status,
  commentCount: brief.comment_count,
  isOwned: brief.owner_id === userId,
  createdAt: brief.created_at,
  updatedAt: brief.updated_at
}
```

**Key Transformations:**
- Convert snake_case to camelCase
- Calculate `isOwned` flag by comparing `owner_id` with current `userId`
- Ensure timestamps are ISO 8601 strings

#### 8. Pagination Metadata Calculation

```typescript
const totalPages = Math.ceil(total / limit)

const pagination: PaginationMetadata = {
  page,
  limit,
  total,
  totalPages
}
```

#### 9. Response Construction
- Combine data array and pagination metadata
- Return NextResponse.json() with PaginatedResponse and 200 status
- If database error: Return 500 error response

### Database Interactions

**Tables Accessed:**
- `briefs` (read) - Main briefs data
- `brief_recipients` (read) - Shared briefs relationship

**Query Patterns:**

**For Owned Briefs:**
```sql
SELECT *
FROM briefs
WHERE owner_id = $1
  AND ($2::brief_status IS NULL OR status = $2)
ORDER BY updated_at DESC
LIMIT $3 OFFSET $4
```

**For Shared Briefs:**
```sql
SELECT b.*
FROM briefs b
INNER JOIN brief_recipients br ON b.id = br.brief_id
WHERE br.recipient_id = $1
  AND b.owner_id != $1
  AND ($2::brief_status IS NULL OR b.status = $2)
ORDER BY b.updated_at DESC
LIMIT $3 OFFSET $4
```

**Count Query:**
Similar queries with `COUNT(*)` instead of `SELECT *`

**Indexes Used:**
- `briefs(owner_id, updated_at DESC)` - For owned briefs pagination
- `brief_recipients(recipient_id)` - For shared briefs lookup
- `briefs(status, updated_at DESC)` - For status filtering

**Expected Query Time:**
- Single page: < 50ms
- With count: < 100ms (two queries)

### External Service Dependencies

**Supabase Auth:**
- Token validation and session management
- User identification
- Automatic cookie handling via @supabase/ssr

**Supabase Database:**
- PostgreSQL query execution
- Row Level Security policy enforcement (if configured)
- Connection pooling for performance

## 6. Security Considerations

### Authentication

**JWT Token Validation:**
- Supabase automatically validates JWT signature and expiration
- Token must be valid and not expired (default: 1 hour expiration)
- Use `supabase.auth.getUser()` which validates token server-side

**Implementation:**
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  return NextResponse.json(
    { error: 'Invalid or expired token' },
    { status: 401 }
  )
}
```

### Authorization

**Data Access Control:**
- User can only see briefs they own OR briefs shared with them
- Ownership check: `briefs.owner_id = userId`
- Shared access check: `brief_recipients.recipient_id = userId`
- No risk of horizontal privilege escalation when using proper WHERE clauses

**Row Level Security (Optional Enhancement):**
```sql
-- Policy for owned briefs
CREATE POLICY "Users can view own briefs"
ON briefs FOR SELECT
USING (auth.uid() = owner_id);

-- Policy for shared briefs
CREATE POLICY "Users can view shared briefs"
ON briefs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM brief_recipients
    WHERE brief_recipients.brief_id = briefs.id
      AND brief_recipients.recipient_id = auth.uid()
  )
);
```

### Data Protection

**Sensitive Data Handling:**
- Only expose BriefListItemDto fields (no full content in list view)
- Correctly calculate `isOwned` flag for UI logic
- Don't expose:
  - Full brief content (use detail endpoint)
  - Internal database metadata
  - Other users' private information

**Transport Security:**
- All communication over HTTPS (enforced by Vercel)
- JWT token transmitted in Authorization header (not in URL)

### Input Validation

**Query Parameter Validation:**
- Use Zod for type-safe validation
- Sanitize and coerce string inputs to numbers
- Validate enum values against allowed options
- Prevent SQL injection via parameterized queries (Supabase SDK handles this)

**Validation Schema:**
```typescript
const BriefQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  filter: z.enum(['owned', 'shared']).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'needs_modification']).optional()
})
```

### Security Headers

**CORS Configuration:**
- Configure appropriate CORS headers in Next.js middleware
- Restrict allowed origins to application domain(s)

**Content Security Policy:**
- Set CSP headers to prevent XSS attacks
- Configure in `next.config.ts` or middleware

### Threat Mitigation

| Threat | Mitigation Strategy |
|--------|---------------------|
| Token theft | HTTPS only, httpOnly cookies, secure token storage |
| Token expiration | Return 401, client should refresh token or re-authenticate |
| Session fixation | Supabase handles session management securely |
| SQL injection | Use Supabase TypeScript SDK with parameterized queries |
| XSS attacks | Next.js auto-escaping, CSP headers, sanitized output |
| Horizontal privilege escalation | User ID from session, explicit WHERE clauses for ownership/sharing |
| Performance DoS | Rate limiting (100 req/min), max page size (50) |
| Data leakage | Return only necessary fields, no full content in list view |

### Rate Limiting (Recommended)

**Implementation:**
- Limit to 100 requests/minute per user
- Implement in Next.js middleware
- Return 429 Too Many Requests if exceeded

## 7. Error Handling

### Error Handling Strategy

Follow clean code principles from project guidelines:
- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions
- Place happy path last in the function
- Use guard clauses for preconditions
- Implement proper error logging with user-friendly messages

### Error Scenarios

#### 1. Missing Authorization Header

**Trigger:** Request without `Authorization` header or malformed header

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "error": "Unauthorized"
}
```

**Handler Logic:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
```

#### 2. Invalid JWT Token

**Trigger:** Token signature invalid, token tampered with, or token format incorrect

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "error": "Invalid or expired token"
}
```

**Handler Logic:**
```typescript
if (error || !user) {
  console.error('[GET /api/briefs] Auth error:', error)
  return NextResponse.json(
    { error: 'Invalid or expired token' },
    { status: 401 }
  )
}
```

#### 3. Expired JWT Token

**Trigger:** Token past expiration time (exp claim)

**HTTP Status:** `401 Unauthorized`

**Response:**
```json
{
  "error": "Invalid or expired token"
}
```

**Handler Logic:** Same as invalid token (handled by Supabase Auth)

#### 4. Invalid Query Parameters

**Trigger:** Query parameters fail Zod validation

**HTTP Status:** `400 Bad Request`

**Response:**
```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "field": "page",
      "message": "Page must be at least 1"
    }
  ]
}
```

**Handler Logic:**
```typescript
const validationResult = BriefQuerySchema.safeParse({
  page: searchParams.get('page'),
  limit: searchParams.get('limit'),
  filter: searchParams.get('filter'),
  status: searchParams.get('status')
})

if (!validationResult.success) {
  const details = validationResult.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }))

  return NextResponse.json(
    { error: 'Invalid query parameters', details },
    { status: 400 }
  )
}
```

**Specific Validation Errors:**
- Page < 1: "Page must be at least 1"
- Limit < 1 or > 50: "Limit must be between 1 and 50"
- Invalid filter: "Invalid enum value. Expected 'owned' | 'shared'"
- Invalid status: "Invalid enum value. Expected 'draft' | 'sent' | 'accepted' | 'rejected' | 'needs_modification'"

#### 5. Database Query Error

**Trigger:** PostgreSQL connection failure, network timeout, or Supabase service outage

**HTTP Status:** `500 Internal Server Error`

**Response:**
```json
{
  "error": "Internal server error"
}
```

**Handler Logic:**
```typescript
try {
  const result = await getBriefs(supabase, user.id, params)
  // ... rest of logic
} catch (err) {
  console.error('[GET /api/briefs] Database error:', err)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

#### 6. Unexpected Exceptions

**Trigger:** Unhandled runtime errors, type errors, or unexpected null values

**HTTP Status:** `500 Internal Server Error`

**Response:**
```json
{
  "error": "Internal server error"
}
```

**Handler Logic:** Wrap entire handler in try-catch at the top level

### Error Logging

**Development Environment:**
- Log full error details to console
- Include stack traces for debugging
- Use descriptive log prefixes: `[GET /api/briefs]`

**Production Environment:**
- Log errors to monitoring service (e.g., Sentry, LogRocket)
- Sanitize error messages (no sensitive data in logs)
- Include request metadata (user ID, timestamp, request ID, query params)

**Example Logging:**
```typescript
console.error('[GET /api/briefs] Auth error:', {
  error: error.message,
  timestamp: new Date().toISOString(),
  userId: user?.id || 'unknown'
})

console.error('[GET /api/briefs] Query error:', {
  error: err.message,
  userId: user.id,
  params: { page, limit, filter, status },
  timestamp: new Date().toISOString()
})
```

### Error Recovery

**Client-Side Handling:**
- 401: Redirect to login, refresh token
- 400: Show validation errors to user, allow correction
- 500: Show generic error message, provide retry option
- Empty results: Show "no briefs found" message with create prompt

## 8. Performance Considerations

### Query Optimization

**Database Indexes:**
- `briefs(owner_id, updated_at DESC)` - Optimizes owned briefs query with ordering
- `briefs(status, updated_at DESC)` - Optimizes status filtering
- `brief_recipients(recipient_id)` - Optimizes shared briefs lookup
- `brief_recipients(brief_id, recipient_id)` UNIQUE - Prevents duplicate shares
- Primary key indexes on all `id` columns (automatically created)

**Query Efficiency:**
- Use indexed columns in WHERE clauses
- Order by indexed `updated_at` column
- Use `range()` for efficient pagination (LIMIT/OFFSET)
- Request count in same query with `{ count: 'exact' }`
- Expected query time: < 100ms (including count)

**Avoiding N+1 Queries:**
- Single query retrieves all brief data
- `comment_count` is denormalized in briefs table (no additional query needed)
- No need to query for recipients in list view

### Pagination Strategy

**Offset-Based Pagination:**
- Uses `page` and `limit` parameters
- Implemented with `.range(offset, offset + limit - 1)`
- Good for small to medium datasets
- Performance degrades with very high page numbers

**Optimization:**
```typescript
const offset = (page - 1) * limit
const query = supabase
  .from('briefs')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1)
```

**Alternative for Large Datasets (Future Enhancement):**
- Cursor-based pagination using `updated_at` and `id`
- More efficient for deep pagination
- Requires different API design

### Caching Strategy

**Server-Side Caching:**
- Consider caching for short duration (30-60 seconds)
- Cache key: `briefs:${userId}:${page}:${limit}:${filter}:${status}`
- Invalidate on brief creation, update, deletion
- Use Next.js `unstable_cache` or Redis

**Example (optional optimization):**
```typescript
import { unstable_cache } from 'next/cache'

const getCachedBriefs = unstable_cache(
  async (supabase, userId, params) => getBriefs(supabase, userId, params),
  ['briefs-list'],
  { revalidate: 60, tags: [`user-briefs-${userId}`] }
)
```

**Client-Side Caching:**
- Frontend can cache response with SWR or React Query
- Implement stale-while-revalidate pattern
- Refresh on user actions (create, update, delete)
- Cache TTL: 1-5 minutes

**Cache Invalidation:**
- On brief creation: invalidate all pages for user
- On brief update: invalidate affected pages
- On brief deletion: invalidate affected pages
- On sharing: invalidate recipient's cache

### Response Size Optimization

**Payload Size:**
- Single item: ~300-400 bytes (JSON)
- 10 items: ~3-4 KB
- 50 items (max): ~15-20 KB
- Pagination metadata: ~100 bytes

**Compression:**
- Next.js/Vercel automatically applies gzip/brotli compression
- Expected compression ratio: 70-80%
- Actual transfer size for 10 items: ~1-1.5 KB

**Optimization:**
- Exclude `content` field from list view (significant size reduction)
- Only return necessary fields in BriefListItemDto
- Use efficient JSON serialization

### Network Performance

**Edge Deployment:**
- Deploy to Vercel Edge Network for low latency
- Use Supabase connection pooling for database efficiency
- Consider regional Supabase deployment

**Expected Response Times:**
- Database query: < 100ms (including count)
- Auth validation: < 5ms
- JSON serialization: < 5ms
- **Total server time: < 120ms**
- Network latency: varies by location (50-200ms typical)
- **Total user-perceived time: < 300ms**

### Scalability Considerations

**Load Testing:**
- Endpoint can handle moderate RPS (requests per second)
- Bottleneck: Database connection pool and query performance
- Supabase connection pool: configurable (default 15 connections)

**Rate Limiting:**
- Implement rate limiting per user
- Suggested limit: 100 requests/minute per user
- Implement in Next.js middleware or use Vercel rate limiting

**Monitoring:**
- Track endpoint response times (p50, p95, p99)
- Monitor database query performance
- Alert on elevated error rates (> 1% of requests)
- Track pagination usage patterns (deep pagination)

**Database Performance:**
- For 1,000 briefs per user: < 100ms query time
- For 10,000 briefs per user: < 200ms query time
- For 100,000+ briefs: consider partitioning or cursor pagination

### Optimization Recommendations

**Immediate:**
1. Ensure all recommended indexes exist
2. Use `.select()` with specific columns (avoid `SELECT *`)
3. Implement request validation with Zod
4. Add basic error logging

**Short-term:**
1. Implement server-side caching (60s TTL)
2. Add rate limiting (100 req/min per user)
3. Monitor query performance in production
4. Set up error tracking (Sentry)

**Long-term:**
1. Consider cursor-based pagination for large datasets
2. Implement database query monitoring
3. Optimize indexes based on actual usage patterns
4. Consider read replicas for high traffic

## 9. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/brief.schema.ts` (create if not exists)

**Purpose:** Define input validation schema for query parameters

**Tasks:**
1. Create schema file with proper TypeScript imports
2. Import Zod from `zod`
3. Define `BriefQuerySchema`:
   - `page`: coerce to number, integer, min 1, default 1
   - `limit`: coerce to number, integer, min 1, max 50, default 10
   - `filter`: enum ["owned", "shared"], optional
   - `status`: enum with all BriefStatus values, optional
4. Export schema for use in Route Handler
5. Add JSDoc comments for documentation

**Example Structure:**
```typescript
import { z } from 'zod'

/**
 * Validation schema for GET /api/briefs query parameters
 */
export const BriefQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  filter: z.enum(['owned', 'shared']).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'needs_modification']).optional()
})

export type BriefQueryInput = z.infer<typeof BriefQuerySchema>
```

### Step 2: Create Brief Service

**File:** `src/lib/services/brief.service.ts` (create if not exists)

**Purpose:** Encapsulate business logic for brief retrieval and pagination

**Tasks:**
1. Create service file with proper TypeScript imports
2. Import types: `SupabaseClient`, `BriefListItemDto`, `PaginatedResponse`, `BriefQueryParams` from `@/types`
3. Implement `getBriefs()` function:
   - Accept Supabase client, user ID, and query parameters
   - Build query based on filter parameter (owned/shared/all)
   - Apply status filter if provided
   - Apply pagination with `range()`
   - Get total count with `{ count: 'exact' }`
   - Handle query errors
   - Transform BriefEntity to BriefListItemDto (snake_case to camelCase)
   - Calculate `isOwned` flag for each brief
   - Calculate pagination metadata (totalPages)
   - Return `PaginatedResponse<BriefListItemDto>`
4. Add JSDoc comments for function documentation
5. Export function for use in Route Handler

**Example Structure:**
```typescript
import type { SupabaseClient, BriefListItemDto, PaginatedResponse, BriefQueryParams } from '@/types'

/**
 * Retrieves paginated list of briefs for a user
 * Includes owned briefs and briefs shared with the user
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID
 * @param params - Query parameters (page, limit, filter, status)
 * @returns Paginated response with briefs and metadata
 * @throws Error if database query fails
 */
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  // Implementation
}
```

**Implementation Details:**

**Query Construction:**
```typescript
const { page = 1, limit = 10, filter, status } = params
const offset = (page - 1) * limit

// Build base query based on filter
let query = supabase.from('briefs').select('*', { count: 'exact' })

if (filter === 'owned') {
  query = query.eq('owner_id', userId)
} else if (filter === 'shared') {
  // Use subquery or join with brief_recipients
  const { data: sharedBriefIds } = await supabase
    .from('brief_recipients')
    .select('brief_id')
    .eq('recipient_id', userId)

  const briefIds = sharedBriefIds?.map(r => r.brief_id) || []
  query = query.in('id', briefIds).neq('owner_id', userId)
} else {
  // Get both owned and shared
  const { data: sharedBriefIds } = await supabase
    .from('brief_recipients')
    .select('brief_id')
    .eq('recipient_id', userId)

  const briefIds = sharedBriefIds?.map(r => r.brief_id) || []
  query = query.or(`owner_id.eq.${userId},id.in.(${briefIds.join(',')})`)
}

// Apply status filter
if (status) {
  query = query.eq('status', status)
}

// Apply pagination
query = query
  .order('updated_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

**Data Transformation:**
```typescript
const briefs: BriefListItemDto[] = data.map(brief => ({
  id: brief.id,
  ownerId: brief.owner_id,
  header: brief.header,
  footer: brief.footer,
  status: brief.status,
  commentCount: brief.comment_count,
  isOwned: brief.owner_id === userId,
  createdAt: brief.created_at,
  updatedAt: brief.updated_at
}))
```

**Pagination Metadata:**
```typescript
const totalPages = Math.ceil((count || 0) / limit)

return {
  data: briefs,
  pagination: {
    page,
    limit,
    total: count || 0,
    totalPages
  }
}
```

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/route.ts`

**Purpose:** Handle HTTP GET requests for briefs list

**Tasks:**
1. Create directory structure: `src/app/api/briefs/`
2. Create `route.ts` file
3. Import dependencies:
   - `NextRequest`, `NextResponse` from `next/server`
   - `createSupabaseServerClient` from `@/db/supabase.server`
   - `getBriefs` from `@/lib/services/brief.service`
   - `BriefQuerySchema` from `@/lib/schemas/brief.schema`
   - Types: `BriefListItemDto`, `PaginatedResponse`, `ErrorResponse`
4. Implement `GET` function:
   - Mark as async
   - Accept `request: NextRequest` parameter
   - Wrap in try-catch for error handling
   - Create Supabase client
   - Authenticate user with `supabase.auth.getUser()`
   - Handle authentication errors (401)
   - Parse and validate query parameters with Zod
   - Handle validation errors (400)
   - Call `getBriefs()` service
   - Return success response with paginated data (200)
5. Configure route segment options:
   - `export const dynamic = 'force-dynamic'` to prevent caching

**Example Structure:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/db/supabase.server'
import { getBriefs } from '@/lib/services/brief.service'
import { BriefQuerySchema } from '@/lib/schemas/brief.schema'
import type { BriefListItemDto, PaginatedResponse, ErrorResponse } from '@/types'

/**
 * GET /api/briefs
 * Retrieves paginated list of briefs for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Guard: Check authentication
    if (authError || !user) {
      console.error('[GET /api/briefs] Authentication failed:', authError)
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const validationResult = BriefQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      filter: searchParams.get('filter'),
      status: searchParams.get('status')
    })

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid query parameters', details },
        { status: 400 }
      )
    }

    // Fetch briefs
    const result = await getBriefs(supabase, user.id, validationResult.data)

    // Happy path: Return paginated briefs
    return NextResponse.json<PaginatedResponse<BriefListItemDto>>(
      result,
      { status: 200 }
    )

  } catch (error) {
    // Handle unexpected errors
    console.error('[GET /api/briefs] Unexpected error:', error)
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'
```

### Step 4: Add Type Safety and Error Handling

**Files:**
- `src/lib/services/brief.service.ts` (update)
- `src/app/api/briefs/route.ts` (update)

**Purpose:** Ensure type-safe database queries and robust error handling

**Tasks:**

1. **Service Level Error Handling:**
   - Wrap database queries in try-catch
   - Differentiate between "no results" (empty array) and "error"
   - Throw descriptive errors for database failures
   - Add defensive null checks
   - Validate query results match expected types

2. **Route Handler Error Handling:**
   - Add guard clause for missing authentication
   - Add guard clause for validation failures
   - Add top-level try-catch for unexpected errors
   - Return proper ErrorResponse objects
   - Log errors with context (endpoint, user ID, params, timestamp)

3. **Error Response Format:**
   - Use ErrorResponse type from `src/types.ts`
   - Consistent error message format
   - User-friendly messages (no stack traces to client)
   - Include validation details for 400 errors

4. **Logging Strategy:**
   - Use `console.error` with descriptive prefixes
   - Include relevant metadata (user ID, error type, params)
   - Avoid logging sensitive data (tokens in production)

**Example Error Handling in Service:**
```typescript
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  try {
    // Query logic...
    const { data, error, count } = await query

    if (error) {
      console.error('[brief.service] Query error:', error)
      throw new Error(`Failed to fetch briefs: ${error.message}`)
    }

    if (!data) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      }
    }

    // Transform and return...
  } catch (err) {
    console.error('[brief.service] Unexpected error:', err)
    throw err
  }
}
```

### Step 5: Implement Security Measures

**Files:**
- `src/app/api/briefs/route.ts` (update)
- `src/middleware.ts` (if implementing rate limiting)

**Purpose:** Secure the endpoint against common vulnerabilities

**Tasks:**

1. **Authentication Verification:**
   - Ensure `supabase.auth.getUser()` is called (not `getSession()`)
   - Validate user object exists before proceeding
   - Return 401 for any authentication failure

2. **Authorization Check:**
   - User ID from session used in queries (not from request params)
   - Queries filter by `owner_id = userId` OR `brief_recipients.recipient_id = userId`
   - No additional authorization needed (implicit access control)

3. **Input Validation:**
   - Zod schema validates all query parameters
   - Enum validation prevents invalid status/filter values
   - Number coercion and range validation for page/limit

4. **Database Security:**
   - Use Supabase SDK with parameterized queries (prevents SQL injection)
   - Consider enabling RLS policies for additional security layer
   - Verify indexes exist for performance and prevent DoS

5. **Rate Limiting (Optional):**
   - Implement in Next.js middleware
   - Limit to 100 requests/minute per user
   - Return 429 Too Many Requests if exceeded

6. **Security Headers:**
   - Ensure HTTPS only in production (Vercel handles this)
   - Add CORS headers if needed (in middleware)

**Example Rate Limiting Middleware:**
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/briefs')) {
    const userId = request.headers.get('x-user-id') // Set in auth middleware
    if (userId) {
      const now = Date.now()
      const limit = rateLimitMap.get(userId)

      if (limit && now < limit.resetAt) {
        if (limit.count >= 100) {
          return NextResponse.json(
            { error: 'Too many requests', retryAfter: Math.ceil((limit.resetAt - now) / 1000) },
            { status: 429 }
          )
        }
        limit.count++
      } else {
        rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 }) // 1 minute
      }
    }
  }

  return NextResponse.next()
}
```

### Step 6: Test Implementation

**Purpose:** Verify endpoint functionality and error handling

**Tasks:**

1. **Unit Tests (Optional but Recommended):**
   - Test `getBriefs()` service function with mock Supabase client
   - Test query construction for different filter scenarios
   - Test data transformation logic
   - Test pagination metadata calculation

2. **Integration Tests:**
   - Test full endpoint with authenticated request
   - Test pagination (different page/limit values)
   - Test filtering (owned, shared, no filter)
   - Test status filtering
   - Test error scenarios (401, 400, 500)

3. **Manual Testing:**
   - Create test user in development Supabase
   - Create sample briefs (owned and shared)
   - Test with Postman or curl:
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

4. **Performance Testing:**
   - Test with varying dataset sizes (10, 100, 1000 briefs)
   - Measure response times
   - Verify query performance with EXPLAIN ANALYZE
   - Test pagination performance at different page numbers

5. **Error Testing:**
   - Test without Authorization header (should return 401)
   - Test with invalid token (should return 401)
   - Test with invalid query params (should return 400)
   - Test with database disconnected (should return 500)

### Step 7: Update API Documentation

**File:** `.docs/api-plan.md` (update)

**Purpose:** Document implementation details and status

**Tasks:**

1. Add "Implementation Status" section to endpoint documentation
2. Mark endpoint as "✅ Implemented"
3. Add links to implementation files:
   - Route Handler: `src/app/api/briefs/route.ts`
   - Service: `src/lib/services/brief.service.ts`
   - Validation Schema: `src/lib/schemas/brief.schema.ts`
4. Document any deviations from original specification
5. Add example requests and responses (if not already present)
6. Update type references if any changes were made
7. Add performance notes (expected response times)

**Example Documentation Update:**
```markdown
## GET /api/briefs

**Status:** ✅ Implemented

**Implementation:**
- Route Handler: [src/app/api/briefs/route.ts](../src/app/api/briefs/route.ts)
- Service: [src/lib/services/brief.service.ts](../src/lib/services/brief.service.ts)
- Validation: [src/lib/schemas/brief.schema.ts](../src/lib/schemas/brief.schema.ts)

**Performance:**
- Expected response time: < 300ms
- Database query time: < 100ms
- Supports up to 50 items per page

**Notes:**
- Implemented offset-based pagination
- Uses denormalized comment_count for performance
- Includes both owned and shared briefs by default
```

### Step 8: Deploy and Monitor

**Purpose:** Deploy to production and verify functionality

**Tasks:**

1. **Pre-deployment Checks:**
   ```bash
   npm run lint           # Check for linting errors
   npm run type-check     # Verify TypeScript types
   npm run build          # Test production build
   ```

2. **Commit Changes:**
   - Write descriptive commit message
   - Follow conventional commits format
   ```bash
   git add .
   git commit -m "feat(api): implement GET /api/briefs endpoint with pagination and filtering"
   ```

3. **Push to Repository:**
   ```bash
   git push origin main
   ```
   - This triggers GitHub Actions CI/CD pipeline
   - Vercel automatically deploys to production

4. **Verify Deployment:**
   - Check GitHub Actions workflow status
   - Verify Vercel deployment succeeds
   - Check deployment logs for errors

5. **Test in Production:**
   - Create test user in production Supabase
   - Authenticate and obtain production token
   - Call endpoint with production URL:
     ```bash
     curl -H "Authorization: Bearer {prod_token}" \
       "https://b2proof.vercel.app/api/briefs?limit=10"
     ```
   - Verify response matches expected format
   - Test all query parameter combinations
   - Verify error responses work correctly

6. **Set Up Monitoring:**
   - Configure error tracking (Sentry, LogRocket)
   - Set up performance monitoring (Vercel Analytics)
   - Create alerts for high error rates (> 1%)
   - Create alerts for slow response times (> 1s)
   - Monitor database query performance

7. **Monitor Initial Traffic:**
   - Watch logs for first 24-48 hours after deployment
   - Track error rates and response times
   - Identify any unexpected issues
   - Check for unusual usage patterns

8. **Document Issues:**
   - Create tickets for any bugs found
   - Document performance bottlenecks
   - Note areas for future optimization

## Appendix

### A. Example Service Implementation

```typescript
// src/lib/services/brief.service.ts
import type { SupabaseClient, BriefListItemDto, PaginatedResponse, BriefQueryParams } from '@/types'

/**
 * Retrieves paginated list of briefs for a user
 * Includes briefs owned by the user and briefs shared with them
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated response with briefs and metadata
 * @throws Error if database query fails
 */
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page = 1, limit = 10, filter, status } = params
  const offset = (page - 1) * limit

  try {
    // Build query based on filter parameter
    let query = supabase.from('briefs').select('*', { count: 'exact' })

    if (filter === 'owned') {
      // Only briefs owned by user
      query = query.eq('owner_id', userId)
    } else if (filter === 'shared') {
      // Only briefs shared with user (not owned by user)
      const { data: sharedBriefIds } = await supabase
        .from('brief_recipients')
        .select('brief_id')
        .eq('recipient_id', userId)

      const briefIds = sharedBriefIds?.map(r => r.brief_id) || []

      if (briefIds.length === 0) {
        // No shared briefs, return empty result
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        }
      }

      query = query.in('id', briefIds).neq('owner_id', userId)
    } else {
      // Both owned and shared briefs
      const { data: sharedBriefIds } = await supabase
        .from('brief_recipients')
        .select('brief_id')
        .eq('recipient_id', userId)

      const briefIds = sharedBriefIds?.map(r => r.brief_id) || []

      if (briefIds.length > 0) {
        query = query.or(`owner_id.eq.${userId},id.in.(${briefIds.join(',')})`)
      } else {
        query = query.eq('owner_id', userId)
      }
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Apply ordering and pagination
    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[brief.service] Query error:', error)
      throw new Error(`Failed to fetch briefs: ${error.message}`)
    }

    // Handle no results
    if (!data) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      }
    }

    // Transform database entities to DTOs
    const briefs: BriefListItemDto[] = data.map(brief => ({
      id: brief.id,
      ownerId: brief.owner_id,
      header: brief.header,
      footer: brief.footer,
      status: brief.status,
      commentCount: brief.comment_count,
      isOwned: brief.owner_id === userId, // Calculate ownership flag
      createdAt: brief.created_at,
      updatedAt: brief.updated_at
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)

    return {
      data: briefs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    }
  } catch (err) {
    console.error('[brief.service] Unexpected error:', err)
    throw err
  }
}
```

### B. Example Route Handler Implementation

```typescript
// src/app/api/briefs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/db/supabase.server'
import { getBriefs } from '@/lib/services/brief.service'
import { BriefQuerySchema } from '@/lib/schemas/brief.schema'
import type { BriefListItemDto, PaginatedResponse, ErrorResponse } from '@/types'

/**
 * GET /api/briefs
 * Retrieves paginated list of briefs for the authenticated user
 * Supports filtering by ownership (owned/shared) and status
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate user
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Guard: Check authentication
    if (authError || !user) {
      console.error('[GET /api/briefs] Authentication failed:', authError)
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const validationResult = BriefQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      filter: searchParams.get('filter'),
      status: searchParams.get('status')
    })

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      console.error('[GET /api/briefs] Validation error:', details)
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid query parameters', details },
        { status: 400 }
      )
    }

    // Step 3: Fetch briefs from service
    const result = await getBriefs(supabase, user.id, validationResult.data)

    // Happy path: Return paginated briefs
    return NextResponse.json<PaginatedResponse<BriefListItemDto>>(
      result,
      { status: 200 }
    )

  } catch (error) {
    // Handle unexpected errors
    console.error('[GET /api/briefs] Unexpected error:', error)
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = 'force-dynamic'
```

### C. Example Validation Schema

```typescript
// src/lib/schemas/brief.schema.ts
import { z } from 'zod'

/**
 * Validation schema for GET /api/briefs query parameters
 * Ensures type safety and valid values for pagination and filtering
 */
export const BriefQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit must be at most 50')
    .default(10),

  filter: z.enum(['owned', 'shared'], {
    errorMap: () => ({ message: "Filter must be either 'owned' or 'shared'" })
  }).optional(),

  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'needs_modification'], {
    errorMap: () => ({
      message: "Invalid status value. Expected 'draft' | 'sent' | 'accepted' | 'rejected' | 'needs_modification'"
    })
  }).optional()
})

/**
 * TypeScript type inferred from schema
 */
export type BriefQueryInput = z.infer<typeof BriefQuerySchema>
```

### D. Database Query Examples

**Query for Owned Briefs:**
```typescript
const { data, error, count } = await supabase
  .from('briefs')
  .select('*', { count: 'exact' })
  .eq('owner_id', userId)
  .eq('status', 'sent') // if status filter applied
  .order('updated_at', { ascending: false })
  .range(0, 9) // first 10 items
```

**Equivalent SQL:**
```sql
SELECT *
FROM briefs
WHERE owner_id = $1
  AND status = $2
ORDER BY updated_at DESC
LIMIT 10 OFFSET 0;

-- Count query (executed in same request with { count: 'exact' })
SELECT COUNT(*)
FROM briefs
WHERE owner_id = $1
  AND status = $2;
```

**Query for Shared Briefs:**
```typescript
// First get shared brief IDs
const { data: sharedBriefIds } = await supabase
  .from('brief_recipients')
  .select('brief_id')
  .eq('recipient_id', userId)

// Then get brief details
const { data, error, count } = await supabase
  .from('briefs')
  .select('*', { count: 'exact' })
  .in('id', briefIds)
  .neq('owner_id', userId) // exclude owned briefs
  .order('updated_at', { ascending: false })
  .range(0, 9)
```

**Equivalent SQL:**
```sql
-- Get shared brief IDs
SELECT brief_id
FROM brief_recipients
WHERE recipient_id = $1;

-- Get brief details
SELECT *
FROM briefs
WHERE id IN (SELECT brief_id FROM brief_recipients WHERE recipient_id = $1)
  AND owner_id != $1
ORDER BY updated_at DESC
LIMIT 10 OFFSET 0;
```

### E. Example cURL Requests

**Get all briefs (first page):**
```bash
curl -X GET "http://localhost:3000/api/briefs" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Get owned briefs with pagination:**
```bash
curl -X GET "http://localhost:3000/api/briefs?filter=owned&page=2&limit=20" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Get shared briefs with status filter:**
```bash
curl -X GET "http://localhost:3000/api/briefs?filter=shared&status=sent" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Test validation error (invalid limit):**
```bash
curl -X GET "http://localhost:3000/api/briefs?limit=100" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Test authentication error (no token):**
```bash
curl -X GET "http://localhost:3000/api/briefs"
```

### F. Performance Benchmarks

**Expected Performance Metrics:**

| Scenario | Brief Count | Query Time | Total Response Time |
|----------|-------------|------------|---------------------|
| Empty result | 0 | < 10ms | < 50ms |
| Small dataset | 10 | < 20ms | < 100ms |
| Medium dataset | 100 | < 50ms | < 150ms |
| Large dataset | 1,000 | < 100ms | < 250ms |
| Very large dataset | 10,000 | < 200ms | < 400ms |

**Optimization Checklist:**
- ✅ Indexes on `owner_id`, `updated_at`, `status`
- ✅ Index on `brief_recipients(recipient_id)`
- ✅ Denormalized `comment_count` (no JOIN needed)
- ✅ Offset-based pagination with `range()`
- ✅ Single query for count and data
- ⚠️ Consider caching for frequently accessed data
- ⚠️ Consider cursor pagination for very large datasets

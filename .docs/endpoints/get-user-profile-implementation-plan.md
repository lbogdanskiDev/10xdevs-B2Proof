# API Endpoint Implementation Plan: Get Current User Profile

## 1. Endpoint Overview

The `GET /api/users/me` endpoint retrieves the authenticated user's profile information. This is a foundational endpoint used throughout the application to identify the current user, their role, and account details. The endpoint requires authentication via JWT Bearer token and returns the user's profile data including their unique identifier, email address, role (creator or client), and account timestamps.

**Purpose:**
- Provide authenticated access to current user's profile
- Enable role-based UI rendering on the frontend
- Support user identity verification across the application

**Key Features:**
- JWT-based authentication via Supabase Auth
- Automatic user identification from session token
- Type-safe response with UserProfileDto
- Comprehensive error handling for auth failures

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/users/me
```

### Headers

**Required:**
- `Authorization: Bearer {jwt_token}` - Supabase JWT token obtained during authentication

**Example:**
```http
GET /api/users/me HTTP/1.1
Host: b2proof.com/api
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Parameters

**Query Parameters:** None

**Path Parameters:** None

**Request Body:** None (GET request)

## 3. Types Used

### Response DTO

**UserProfileDto** (defined in [src/types.ts:101-107](src/types.ts#L101-L107))
```typescript
export interface UserProfileDto {
  id: string              // UUID from auth.users
  email: string           // User's email from auth.users
  role: UserRole          // 'creator' | 'client'
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

### Supporting Types

**UserRole** (defined in [src/types.ts:46](src/types.ts#L46))
```typescript
export type UserRole = Enums<'user_role'>  // 'creator' | 'client'
```

**ErrorResponse** (defined in [src/types.ts:284-288](src/types.ts#L284-L288))
```typescript
export interface ErrorResponse {
  error: string
  details?: ValidationErrorDetail[]
  retryAfter?: number
}
```

### Database Entities

**ProfileEntity** (defined in [src/types.ts:21](src/types.ts#L21))
```typescript
export type ProfileEntity = Tables<'profiles'>
// Maps to profiles table with fields: id, role, created_at, updated_at
```

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "role": "creator",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Field Descriptions:**
- `id`: UUID string matching the user's ID in auth.users table
- `email`: User's email address from Supabase Auth
- `role`: User role enum - either "creator" (can create briefs) or "client" (can view/comment)
- `createdAt`: ISO 8601 timestamp when the profile was created
- `updatedAt`: ISO 8601 timestamp when the profile was last modified

### Error Responses

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

#### 404 Not Found - Profile Missing
```json
{
  "error": "Profile not found"
}
```
**When:** User is authenticated but profile record doesn't exist in database (edge case)

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
[Route Handler] /api/users/me/route.ts
    ↓
Authenticate via Supabase Auth
    ↓
Extract User ID from Session
    ↓
[User Service] src/lib/services/user.service.ts
    ↓
Query Database (profiles + auth.users JOIN)
    ↓
Transform to UserProfileDto
    ↓
Return JSON Response
```

### Detailed Flow

1. **Request Reception**
   - Next.js Route Handler receives GET request
   - Extract Authorization header from request

2. **Authentication**
   - Create Supabase server client using `await createSupabaseServerClient()` from `src/db/supabase.server.ts`
   - Call `supabase.auth.getUser()` to verify JWT token and get user session
   - If authentication fails, return 401 with appropriate error message

3. **User Identification**
   - Extract user ID from authenticated session: `user.id`
   - Pass user ID and Supabase client to User Service

4. **Data Retrieval**
   - User Service queries `profiles` table with user ID
   - Performs join with `auth.users` table to retrieve email
   - Query:
     ```sql
     SELECT
       profiles.id,
       profiles.role,
       profiles.created_at,
       profiles.updated_at,
       auth.users.email
     FROM profiles
     INNER JOIN auth.users ON profiles.id = auth.users.id
     WHERE profiles.id = $1
     ```

5. **Data Transformation**
   - Convert snake_case database fields to camelCase DTO fields
   - Map ProfileEntity + email → UserProfileDto
   - Convert timestamp objects to ISO 8601 strings

6. **Response Construction**
   - If profile found: Return NextResponse.json() with UserProfileDto and 200 status
   - If profile not found: Return 404 error response
   - If database error: Return 500 error response

### Database Interactions

**Tables Accessed:**
- `profiles` (read) - User role and timestamps
- `auth.users` (read via Supabase Auth metadata) - User email

**Query Pattern:**
- Single SELECT with INNER JOIN
- Filtered by user ID (from authenticated session)
- No write operations

**Expected Query Time:** < 10ms (indexed primary key lookup)

### External Service Dependencies

**Supabase Auth:**
- Token validation and session management
- User metadata retrieval (email)
- Automatic cookie handling via @supabase/ssr

**Supabase Database:**
- PostgreSQL query execution
- Row Level Security policy enforcement

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

**Implicit Authorization:**
- User can only access their own profile
- User ID is extracted from authenticated session (not from request parameters)
- No risk of horizontal privilege escalation

**Row Level Security:**
- Ensure RLS policies are enabled on `profiles` table
- Policy should allow users to SELECT their own profile:
  ```sql
  CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
  ```

### Data Protection

**Sensitive Data Handling:**
- Only expose necessary fields in UserProfileDto
- Do not expose:
  - Password hashes (handled by Supabase Auth, not in our tables)
  - Auth metadata (JWT claims, tokens, refresh tokens)
  - Internal database IDs beyond user ID

**Transport Security:**
- All communication over HTTPS (enforced by Vercel)
- JWT token transmitted in Authorization header (not in URL)

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
| CSRF attacks | Not applicable (GET request, no state mutation) |
| Horizontal privilege escalation | User ID from session, not from request parameters |

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
  console.error('[GET /api/users/me] Auth error:', error)
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

#### 4. Profile Not Found

**Trigger:** User authenticated but profile record missing from database

**HTTP Status:** `404 Not Found`

**Response:**
```json
{
  "error": "Profile not found"
}
```

**Handler Logic:**
```typescript
const profile = await getUserProfile(supabase, user.id)

if (!profile) {
  console.error('[GET /api/users/me] Profile not found for user:', user.id)
  return NextResponse.json(
    { error: 'Profile not found' },
    { status: 404 }
  )
}
```

**Note:** This should be extremely rare due to database triggers that auto-create profiles

#### 5. Database Connection Error

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
  const profile = await getUserProfile(supabase, user.id)
  // ... rest of logic
} catch (err) {
  console.error('[GET /api/users/me] Database error:', err)
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
- Use descriptive log prefixes: `[GET /api/users/me]`

**Production Environment:**
- Log errors to monitoring service (e.g., Sentry, LogRocket)
- Sanitize error messages (no sensitive data in logs)
- Include request metadata (user ID, timestamp, request ID)

**Example Logging:**
```typescript
console.error('[GET /api/users/me] Auth error:', {
  error: error.message,
  timestamp: new Date().toISOString(),
  userId: user?.id || 'unknown'
})
```

## 8. Performance Considerations

### Query Optimization

**Database Indexes:**
- Primary key index on `profiles.id` (automatically created) - ensures O(1) lookup
- Foreign key index on `profiles.id → auth.users.id` (Supabase maintains)

**Query Efficiency:**
- Single database round-trip
- Uses indexed primary key lookup
- Expected query time: < 10ms
- No N+1 query problems (single record fetch)

**Query Pattern:**
```typescript
// Efficient: Single query with join
const { data, error } = await supabase
  .from('profiles')
  .select('id, role, created_at, updated_at')
  .eq('id', userId)
  .single()

// Then get email from auth metadata (already loaded in session)
```

### Caching Strategy

**Server-Side Caching:**
- Consider caching profile data for short duration (30-60 seconds)
- Use Next.js built-in caching with `unstable_cache` if needed
- Cache key: `user-profile:${userId}`
- Invalidate on profile updates

**Client-Side Caching:**
- Frontend can cache response in memory or localStorage
- Refresh on user actions that modify profile
- Consider using SWR or React Query for automatic cache management

**Example (optional optimization):**
```typescript
import { unstable_cache } from 'next/cache'

const getCachedProfile = unstable_cache(
  async (supabase, userId) => getUserProfile(supabase, userId),
  ['user-profile'],
  { revalidate: 60 } // 60 seconds
)
```

### Response Size Optimization

**Payload Size:**
- Current response: ~200-300 bytes (JSON)
- Minimal data transfer (only 5 fields)
- No large objects or arrays

**Compression:**
- Next.js/Vercel automatically applies gzip/brotli compression
- No additional optimization needed

### Network Performance

**Edge Deployment:**
- Deploy to Vercel Edge Network for low latency
- Use Supabase connection pooling for database efficiency

**Expected Response Times:**
- Database query: < 10ms
- Auth validation: < 5ms
- JSON serialization: < 1ms
- **Total server time: < 20ms**
- Network latency: varies by location (50-200ms typical)

### Scalability Considerations

**Load Testing:**
- Endpoint can handle high RPS (requests per second)
- No complex computations or heavy joins
- Bottleneck: Database connection pool (configurable in Supabase)

**Rate Limiting:**
- Consider implementing rate limiting per user
- Suggested limit: 100 requests/minute per user
- Implement in Next.js middleware or use Vercel rate limiting

**Monitoring:**
- Track endpoint response times
- Monitor database query performance
- Alert on elevated error rates (> 1% of requests)

## 9. Implementation Steps

### Step 1: Create User Service

**File:** `src/lib/services/user.service.ts`

**Purpose:** Encapsulate business logic for user profile retrieval

**Tasks:**
1. Create service file with proper TypeScript imports
2. Import types: `SupabaseClient`, `UserProfileDto`, `ProfileEntity`, `UserRole` from `@/types`
3. Implement `getUserProfile()` function:
   - Accept Supabase client and user ID as parameters
   - Query `profiles` table with `.eq('id', userId).single()`
   - Handle query errors
   - Transform snake_case fields to camelCase
   - Get email from Supabase auth metadata
   - Return `UserProfileDto | null`
4. Add JSDoc comments for function documentation
5. Export function for use in Route Handler

**Example Structure:**
```typescript
import type { SupabaseClient, UserProfileDto } from '@/types'

/**
 * Retrieves a user's profile by their ID
 * @param supabase - Supabase client instance
 * @param userId - User's UUID
 * @returns UserProfileDto or null if not found
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileDto | null> {
  // Implementation
}
```

### Step 2: Implement Route Handler

**File:** `src/app/api/users/me/route.ts`

**Purpose:** Handle HTTP GET requests for user profile

**Tasks:**
1. Create directory structure: `src/app/api/users/me/`
2. Create `route.ts` file
3. Import dependencies:
   - `NextResponse` from `next/server`
   - `createSupabaseServerClient` from `@/db/supabase.server`
   - `getUserProfile` from `@/lib/services/user.service`
   - Types: `UserProfileDto`, `ErrorResponse`
4. Implement `GET` function:
   - Mark as async
   - Wrap in try-catch for error handling
   - Create Supabase client
   - Authenticate user with `supabase.auth.getUser()`
   - Handle authentication errors (401)
   - Call `getUserProfile()` service
   - Handle profile not found (404)
   - Return success response with profile data (200)
5. Configure route segment options (optional):
   - `export const runtime = 'edge'` for edge deployment
   - `export const dynamic = 'force-dynamic'` to prevent caching

**Example Structure:**
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/db/supabase.server'
import { getUserProfile } from '@/lib/services/user.service'
import type { UserProfileDto, ErrorResponse } from '@/types'

export async function GET() {
  try {
    // Authentication
    // Service call
    // Response
  } catch (error) {
    // Error handling
  }
}
```

### Step 3: Add Type Safety Validation

**File:** `src/lib/services/user.service.ts` (update)

**Purpose:** Ensure type-safe database queries and response transformation

**Tasks:**
1. Verify Supabase query uses correct table name and fields
2. Add type assertion for database response: `.returns<ProfileEntity>()`
3. Validate field mapping from database to DTO:
   - `id` → `id`
   - `role` → `role`
   - `created_at` → `createdAt`
   - `updated_at` → `updatedAt`
4. Handle timestamp conversion:
   - Convert PostgreSQL timestamp to ISO 8601 string
   - Use `.toISOString()` method
5. Add null checks for all fields before transformation
6. Test with TypeScript strict mode enabled

### Step 4: Implement Error Handling

**Files:**
- `src/app/api/users/me/route.ts` (update)
- `src/lib/services/user.service.ts` (update)

**Purpose:** Robust error handling following project guidelines

**Tasks:**
1. **Route Handler Level:**
   - Add guard clause for missing authentication
   - Add guard clause for profile not found
   - Add top-level try-catch for unexpected errors
   - Return proper ErrorResponse objects
   - Log errors with context (endpoint, user ID, timestamp)

2. **Service Level:**
   - Handle Supabase query errors
   - Differentiate between "not found" and "error"
   - Throw/return appropriate errors
   - Add defensive null checks

3. **Error Response Format:**
   - Use ErrorResponse type from `src/types.ts`
   - Consistent error message format
   - User-friendly messages (no stack traces to client)

4. **Logging Strategy:**
   - Use `console.error` with descriptive prefixes
   - Include relevant metadata (user ID, error type)
   - Avoid logging sensitive data (tokens, emails in production)

### Step 5: Add Security Measures

**Files:**
- `src/app/api/users/me/route.ts` (update)
- `src/middleware.ts` (if implementing rate limiting)

**Purpose:** Secure the endpoint against common vulnerabilities

**Tasks:**
1. **Authentication Verification:**
   - Ensure `supabase.auth.getUser()` is called (not `getSession()`)
   - Validate user object exists before proceeding
   - Return 401 for any authentication failure

2. **Authorization Check:**
   - Verify user ID from session matches profile being fetched
   - No additional authorization needed (implicit self-access)

3. **Database Security:**
   - Verify RLS policies exist on profiles table
   - Test RLS prevents unauthorized access
   - Use parameterized queries (Supabase SDK handles this)

4. **Rate Limiting (Optional):**
   - Implement in Next.js middleware
   - Limit to 100 requests/minute per user
   - Return 429 Too Many Requests if exceeded

5. **Security Headers:**
   - Add CORS headers if needed
   - Ensure HTTPS only in production


### Step 6: Update API Documentation

**File:** `.docs/api-plan.md` (update)

**Purpose:** Document implementation details

**Tasks:**
1. Add "Implementation Status" section to endpoint documentation
2. Mark endpoint as "✅ Implemented"
3. Add links to implementation files:
   - Route Handler: `src/app/api/users/me/route.ts`
   - Service: `src/lib/services/user.service.ts`
4. Document any deviations from original specification
5. Add example requests and responses (if not already present)
6. Update type references if any changes were made

### Step 7: Deploy and Monitor

**Purpose:** Deploy to production and verify functionality

**Tasks:**
1. Run pre-deployment checks:
   ```bash
   npm run lint           # Check for linting errors
   npm run type-check     # Verify TypeScript types
   npm run build          # Test production build
   ```
2. Commit changes with descriptive commit message
3. Push to main branch (triggers GitHub Actions)
4. Verify Vercel deployment succeeds
5. Test endpoint in production:
   - Create test user in production Supabase
   - Authenticate and obtain token
   - Call endpoint with production URL
   - Verify response
6. Set up monitoring:
   - Configure error tracking (Sentry, LogRocket)
   - Set up performance monitoring (Vercel Analytics)
   - Create alerts for high error rates
7. Monitor logs for first 24 hours after deployment
8. Document any issues in project tracker

## Appendix

### A. Example Service Implementation

```typescript
// src/lib/services/user.service.ts
import type { SupabaseClient, UserProfileDto } from '@/types'

/**
 * Retrieves a user's profile by their ID
 * Combines data from profiles table and auth metadata
 *
 * @param supabase - Supabase client instance
 * @param userId - User's UUID from auth.users
 * @returns UserProfileDto or null if profile not found
 * @throws Error if database query fails
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileDto | null> {
  // Query profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[user.service] Error fetching profile:', error)
    throw new Error('Failed to fetch user profile')
  }

  if (!profile) {
    return null
  }

  // Get email from auth metadata
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('[user.service] Error fetching auth user:', authError)
    throw new Error('Failed to fetch user email')
  }

  // Transform to DTO with camelCase fields
  return {
    id: profile.id,
    email: user.email!,
    role: profile.role,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  }
}
```

### B. Example Route Handler Implementation

```typescript
// src/app/api/users/me/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/db/supabase.server'
import { getUserProfile } from '@/lib/services/user.service'
import type { UserProfileDto, ErrorResponse } from '@/types'

/**
 * GET /api/users/me
 * Retrieves the authenticated user's profile
 */
export async function GET() {
  try {
    // Create Supabase client with auth context
    const supabase = await createSupabaseServerClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Guard: Check authentication
    if (authError || !user) {
      console.error('[GET /api/users/me] Authentication failed:', authError)
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch user profile
    const profile = await getUserProfile(supabase, user.id)

    // Guard: Check profile exists
    if (!profile) {
      console.error('[GET /api/users/me] Profile not found for user:', user.id)
      return NextResponse.json<ErrorResponse>(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Happy path: Return profile
    return NextResponse.json<UserProfileDto>(profile, { status: 200 })

  } catch (error) {
    // Handle unexpected errors
    console.error('[GET /api/users/me] Unexpected error:', error)
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Configure route segment
export const dynamic = 'force-dynamic' // Disable caching for auth endpoints
```

### C. Database Query Examples

**Direct Supabase Query:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, role, created_at, updated_at')
  .eq('id', userId)
  .single()
```

**Equivalent SQL:**
```sql
SELECT id, role, created_at, updated_at
FROM profiles
WHERE id = $1
LIMIT 1
```

**With Email Join (alternative approach):**
```typescript
// Note: Supabase doesn't allow direct joins with auth.users
// Email must be fetched from auth metadata separately
const { data: { user } } = await supabase.auth.getUser()
const email = user.email
```

# API Endpoint Implementation Plan: Get Current User Profile

## 1. Endpoint Overview

The `GET /api/users/me` endpoint retrieves the authenticated user's profile information. This is a foundational endpoint used to identify the current user, their role, and account details.

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
- `Authorization: Bearer {jwt_token}` - Supabase JWT token

### Parameters
**Query Parameters:** None
**Path Parameters:** None
**Request Body:** None (GET request)

## 3. Types Used

**Response DTO:** `UserProfileDto` - See [src/types.ts:101-107](src/types.ts#L101-L107)
```typescript
export interface UserProfileDto {
  id: string              // UUID from auth.users
  email: string           // User's email from auth.users
  role: UserRole          // 'creator' | 'client'
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

**Supporting Types:** `UserRole`, `ErrorResponse` - See [src/types.ts](src/types.ts)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "role": "creator",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

### Error Responses

| Status | Error | When |
|--------|-------|------|
| 401 | Unauthorized | No Authorization header or malformed |
| 401 | Invalid or expired token | JWT token invalid, expired, or cannot be verified |
| 404 | Profile not found | User authenticated but profile record missing (rare) |
| 500 | Internal server error | Database failure or unexpected exception |

## 5. Authorization

**Implicit Authorization:**
- User can only access their own profile
- User ID extracted from authenticated session (not from request)
- No risk of horizontal privilege escalation

## 6. Security Considerations

### Authentication & Authorization
- Use `supabase.auth.getUser()` for server-side token validation
- User ID from session only (never from request params)
- No additional authorization needed (implicit self-access)

### Threat Mitigation

| Threat | Mitigation |
|--------|-----------|
| Token theft | HTTPS only, httpOnly cookies |
| Token expiration | Return 401, client refreshes token |
| SQL injection | Supabase SDK parameterized queries |
| XSS attacks | Next.js auto-escaping, CSP headers |
| Horizontal privilege escalation | User ID from session only |

### Input Validation
- No input parameters to validate (GET request, no query params)
- User ID extracted from authenticated session only

### Row Level Security
Ensure RLS policies are enabled on `profiles` table:
```sql
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

## 7. Error Handling

**Error Handling Strategy:**
- Use guard clauses for early returns on authentication failures
- Throw descriptive errors from service layer for database failures
- Return appropriate HTTP status codes via NextResponse

**Logging Strategy:**
- Development: `console.error()` with full error context (user ID, error stack)
- Production: structured logging to error tracking service (Sentry)
- Log levels:
  - ERROR: 500 errors, database failures, unexpected exceptions
  - WARN: 401 errors (expired tokens), 404 errors (missing profiles)
  - INFO: successful requests (optional for analytics)

## 8. Implementation Steps

### Step 1: Create User Service

**File:** `src/lib/services/user.service.ts`

**Function signature:**
```typescript
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileDto | null>
```

**Implementation:**
1. Query `profiles` table with `.eq('id', userId).single()`
2. Handle query errors
3. Transform snake_case fields to camelCase
4. Get email from Supabase auth metadata
5. Return `UserProfileDto | null`

**Example:**
```typescript
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileDto | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !profile) return null

  // Get email from auth metadata
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return {
    id: profile.id,
    email: user.email!,
    role: profile.role,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  }
}
```

### Step 2: Implement Route Handler

**File:** `src/app/api/users/me/route.ts`

**Implementation flow:**
1. Authenticate user with `supabase.auth.getUser()` (401 if failed)
2. Call `getUserProfile()` service
3. Handle profile not found (404)
4. Return success response with profile data (200)

**Error handling:**
```typescript
try {
  // Authenticate, fetch
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  return NextResponse.json(profile, { status: 200 })
} catch (error) {
  console.error('[GET /api/users/me] Error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

**Configuration:**
```typescript
export const dynamic = 'force-dynamic'
```

### Step 3: Testing

**Manual testing with curl:**
```bash
# Get current user profile
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/users/me"

# Test missing token
curl "http://localhost:3000/api/users/me"

# Test invalid token
curl -H "Authorization: Bearer invalid_token" \
  "http://localhost:3000/api/users/me"
```

**Test scenarios:**
- ✅ Successful retrieval with valid token
- ✅ Missing token (401)
- ✅ Invalid token (401)
- ✅ Expired token (401)
- ✅ Profile not found (404 - rare)

### Step 4: Deploy

**Pre-deployment:**
```bash
npm run lint
npm run type-check
npm run build
```

**Commit and deploy:**
```bash
git add .
git commit -m "feat(api): implement GET /api/users/me endpoint"
git push origin main
```

**Monitoring:**
- Configure error tracking (Sentry)
- Set up performance monitoring
- Alert on error rates > 1%

## 9. Performance

**Expected Performance:**
- Target response time: < 100ms (p95)

**Indexes:**
- `profiles(id)` - Primary key (auto-created)

**Optimization:**
- Single database round-trip
- Minimal payload size (~200-300 bytes)
- Consider caching profile data (30-60 seconds) if frequently accessed

## 10. Example Implementation

### Service

```typescript
// src/lib/services/user.service.ts
import type { SupabaseClient, UserProfileDto } from '@/types'

/**
 * Retrieves a user's profile by their ID
 * @param supabase - Supabase client instance
 * @param userId - User's UUID from auth.users
 * @returns UserProfileDto or null if not found
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

  if (!profile) return null

  // Get email from auth metadata
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('[user.service] Error fetching auth user:', authError)
    throw new Error('Failed to fetch user email')
  }

  return {
    id: profile.id,
    email: user.email!,
    role: profile.role,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  }
}
```

### Route Handler

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
    // Authenticate
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[GET /api/users/me] Authentication failed:', authError)
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch profile
    const profile = await getUserProfile(supabase, user.id)

    if (!profile) {
      console.error('[GET /api/users/me] Profile not found for user:', user.id)
      return NextResponse.json<ErrorResponse>(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json<UserProfileDto>(profile, { status: 200 })

  } catch (error) {
    console.error('[GET /api/users/me] Unexpected error:', error)
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
```

# API Endpoint Implementation Plan: Get Brief by ID

## 1. Endpoint Overview

The `GET /api/briefs/:id` endpoint retrieves the complete details of a specific brief, including its full TipTap content structure.

**Purpose:**
- Provide authenticated and authorized access to a single brief's full details
- Return complete TipTap JSON content for rendering in the editor
- Include all metadata (status, timestamps, comment count)
- Enforce access control (owner or shared recipient only)

**Key Features:**
- JWT-based authentication via Supabase Auth
- Authorization check (owner or recipient)
- UUID validation for brief ID
- Full content retrieval including JSONB TipTap document
- Type-safe response with BriefDetailDto

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
/api/briefs/:id
```

### Headers
**Required:**
- `Authorization: Bearer {jwt_token}` - Supabase JWT token

### Parameters

**Path Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | UUID String | Yes | Valid UUID format | Unique identifier of the brief |

**Query Parameters:** None
**Request Body:** None (GET request)

## 3. Types Used

**Response DTO:** `BriefDetailDto` - See [src/types.ts:134-139](src/types.ts#L134-L139)
**Supporting Types:** `BriefStatus`, `ErrorResponse` - See [src/types.ts](src/types.ts)

## 4. Response Details

### Success Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ownerId": "660e8400-e29b-41d4-a716-446655440001",
  "header": "Website Redesign Project",
  "content": { "type": "doc", "content": [...] },
  "footer": "Contact: john@example.com",
  "status": "sent",
  "statusChangedAt": "2025-01-15T10:35:00.000Z",
  "statusChangedBy": "660e8400-e29b-41d4-a716-446655440001",
  "commentCount": 3,
  "isOwned": true,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T11:00:00.000Z"
}
```

### Error Responses

| Status | Error | When |
|--------|-------|------|
| 400 | Invalid brief ID format | Brief ID is not a valid UUID |
| 401 | Unauthorized | No Authorization header or malformed |
| 401 | Invalid or expired token | JWT token invalid, expired, or cannot be verified |
| 403 | You do not have access to this brief | User authenticated but not owner/recipient |
| 404 | Brief not found | Valid UUID but doesn't exist in database |
| 500 | Internal server error | Database failure or unexpected exception |

## 5. Authorization

**Access Control:**
- User must be owner (`briefs.owner_id = userId`) OR recipient (`brief_recipients.recipient_id = userId`)
- Returns 403 if authenticated but unauthorized
- Returns 404 if brief doesn't exist

## 6. Security Considerations

### Authentication & Authorization
- Use `supabase.auth.getUser()` for server-side token validation
- User ID from session only (never from request params)
- Authorization check in service layer before data access

### Threat Mitigation

| Threat | Mitigation |
|--------|-----------|
| Token theft | HTTPS only, httpOnly cookies |
| Token expiration | Return 401, client refreshes token |
| Horizontal privilege escalation | User ID from session, explicit auth checks |
| SQL injection | Supabase SDK parameterized queries |
| XSS attacks | Next.js auto-escaping, CSP headers |
| Resource enumeration | Return 403 for unauthorized (not 404) |

### Input Validation
- Use Zod for UUID validation: `z.string().uuid()`
- Validate before database query

## 7. Implementation Steps

### Step 1: Create Zod Validation Schema

**File:** `src/lib/schemas/brief.schema.ts`

```typescript
import { z } from 'zod'

export const BriefIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID format' })
})

export type BriefIdInput = z.infer<typeof BriefIdSchema>
```

### Step 2: Extend Brief Service

**File:** `src/lib/services/brief.service.ts`

**Implementation:**
1. Query brief by ID with `.single()`
2. Check authorization: owner OR recipient
3. Throw 'FORBIDDEN' error if unauthorized
4. Transform BriefEntity to BriefDetailDto (snake_case to camelCase)
5. Calculate `isOwned` flag
6. Return `BriefDetailDto | null`

**Function signature:**
```typescript
export async function getBriefById(
  supabase: SupabaseClient,
  briefId: string,
  userId: string
): Promise<BriefDetailDto | null>
```

**Authorization check:**
```typescript
const isOwner = brief.owner_id === userId

if (!isOwner) {
  const { data: recipient } = await supabase
    .from('brief_recipients')
    .select('id')
    .eq('brief_id', briefId)
    .eq('recipient_id', userId)
    .single()

  if (!recipient) {
    throw new Error('FORBIDDEN')
  }
}
```

### Step 3: Implement Route Handler

**File:** `src/app/api/briefs/[id]/route.ts`

**Implementation flow:**
1. Validate UUID format with Zod (400 if invalid)
2. Authenticate user with `supabase.auth.getUser()` (401 if failed)
3. Call `getBriefById()` service
4. Handle not found (404)
5. Handle forbidden (403)
6. Return success response (200)

**Error handling:**
```typescript
try {
  // Validate, authenticate, fetch
} catch (error) {
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'You do not have access to this brief' }, { status: 403 })
  }
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
# Get brief as owner
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/briefs/{brief_id}"

# Test forbidden access
curl -H "Authorization: Bearer {other_token}" \
  "http://localhost:3000/api/briefs/{brief_id}"

# Test invalid UUID
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/briefs/not-a-uuid"
```

**Test scenarios:**
- ✅ Successful retrieval (owner)
- ✅ Successful retrieval (recipient)
- ✅ Invalid UUID (400)
- ✅ Missing token (401)
- ✅ Invalid token (401)
- ✅ Unauthorized access (403)
- ✅ Not found (404)

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
git commit -m "feat(api): implement GET /api/briefs/:id endpoint with authorization"
git push origin main
```

**Monitoring:**
- Configure error tracking (Sentry)
- Set up performance monitoring
- Alert on error rates > 1%
- Alert on response times > 1s

## 8. Performance Notes

**Expected Performance:**
- Database query: < 20ms (primary key + unique index)
- Total server time: < 50ms
- User-perceived time: < 250ms

**Indexes:**
- `briefs(id)` - Primary key (auto-created)
- `brief_recipients(brief_id, recipient_id)` - UNIQUE index

## 9. Example Implementation

### Service

```typescript
// src/lib/services/brief.service.ts
export async function getBriefById(
  supabase: SupabaseClient,
  briefId: string,
  userId: string
): Promise<BriefDetailDto | null> {
  const { data: brief, error } = await supabase
    .from('briefs')
    .select('*')
    .eq('id', briefId)
    .single()

  if (error || !brief) return null

  // Check authorization
  const isOwner = brief.owner_id === userId

  if (!isOwner) {
    const { data: recipient } = await supabase
      .from('brief_recipients')
      .select('id')
      .eq('brief_id', briefId)
      .eq('recipient_id', userId)
      .single()

    if (!recipient) throw new Error('FORBIDDEN')
  }

  // Transform and return
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
    isOwned: brief.owner_id === userId,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at
  }
}
```

### Route Handler

```typescript
// src/app/api/briefs/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate UUID
    const validationResult = BriefIdSchema.safeParse({ id: params.id })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid brief ID format', details: [...] },
        { status: 400 }
      )
    }

    // Authenticate
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch brief
    const brief = await getBriefById(supabase, validationResult.data.id, user.id)

    if (!brief) {
      return NextResponse.json(
        { error: 'Brief not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(brief, { status: 200 })

  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'You do not have access to this brief' },
        { status: 403 }
      )
    }

    console.error('[GET /api/briefs/:id] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
```

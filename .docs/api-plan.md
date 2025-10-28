# REST API Plan - B2Proof

## Implementation Status Overview

**Last Updated**: 2025-10-28

### Completed Endpoints (3/14)

| Endpoint | Method | Status | Commit |
|----------|--------|--------|--------|
| `/api/users/me` | GET | ✅ Implemented | [ac762fe](https://github.com/user/repo/commit/ac762fe) |
| `/api/briefs` | GET | ✅ Implemented | [41747d7](https://github.com/user/repo/commit/41747d7) |
| `/api/briefs/:id` | GET | ✅ Implemented | [fef2bc6](https://github.com/user/repo/commit/fef2bc6) |

### Pending Endpoints (11/14)
- `/api/users/me` - DELETE (account deletion)
- `/api/briefs` - POST (create brief)
- `/api/briefs/:id` - PATCH (update content/status)
- `/api/briefs/:id` - DELETE (delete brief)
- `/api/briefs/:id/recipients` - GET, POST, DELETE (recipient management)
- `/api/briefs/:id/comments` - GET, POST (comments)
- `/api/comments/:id` - DELETE (delete comment)

**Progress**: 21% (3/14 endpoints complete)

---

## 1. Overview

This API follows REST principles and uses JSON for request/response payloads. Authentication is handled via Supabase Auth with JWT tokens. All endpoints require HTTPS in production.

**Base URL**: `/api`

**Authentication**: Bearer token in `Authorization` header for protected endpoints

**Date Format**: ISO 8601 (e.g., `2025-01-15T10:30:00Z`)

---

## 2. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Users | `profiles` + `auth.users` | User accounts with role information |
| Briefs | `briefs` | Project briefs created by creators |
| Recipients | `brief_recipients` | Brief sharing relationships |
| Comments | `comments` | Comments on briefs |

---

## 3. Authentication

### 3.1 Authentication Strategy

**Supabase Auth handles all authentication operations:**
- User registration
- Login/logout
- Session management
- Token refresh
- Password reset

**Client-side implementation uses Supabase SSR SDK:**
```typescript
import { createSupabaseBrowserClient } from '@/db/supabase.client'

const supabase = createSupabaseBrowserClient()

// Register
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'Password123',
  options: {
    data: {
      role: 'creator' // Stored in auth.users.raw_user_meta_data
    }
  }
})

// After signup, profile is created automatically via database trigger

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'Password123'
})

// Logout
const { error } = await supabase.auth.signOut()

// Get session
const { data: { session } } = await supabase.auth.getSession()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

**No custom authentication endpoints needed** - Supabase handles everything via its own API.

---

### 3.2 Automatic Profile Creation

**Profile creation is handled automatically via database trigger** when a user signs up through Supabase Auth.

**How it works:**
1. User registers via `supabase.auth.signUp()` with role in metadata:
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'Password123',
     options: {
       data: {
         role: 'creator' // Will be used by trigger
       }
     }
   })
   ```

2. Database trigger `create_profile_for_new_user` automatically:
   - Creates profile in `profiles` table with user's ID
   - Extracts role from `raw_user_meta_data->>'role'`
   - Defaults to `'client'` if no role specified
   - Logs registration to `audit_log`

3. User can immediately use the application with their assigned role

**No API endpoint needed** - everything is handled at the database level via trigger.

---

## 4. User Profile Endpoints

### 4.1 Get Current User Profile ✅ IMPLEMENTED

**GET** `/api/users/me`

Retrieve authenticated user's profile.

**Implementation Status:**
- ✅ Route Handler: [src/app/api/users/me/route.ts](../src/app/api/users/me/route.ts)
- ✅ Service Layer: [src/lib/services/user.service.ts](../src/lib/services/user.service.ts)
- ✅ Error Handling: Custom ApiError classes in [src/lib/errors/](../src/lib/errors/)
- ⚠️ **Development Mode**: Currently returns DEFAULT_USER_PROFILE (auth not implemented yet)

**Headers:**
- `Authorization: Bearer {token}` (not validated in development mode)

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "creator",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token (when auth is implemented)
- `404 Not Found`: Profile not found (when auth is implemented)
- `500 Internal Server Error`: Unexpected server error

---

### 4.2 Change Password

**Handled by Supabase Auth** - use client-side SDK:

```typescript
const { data, error } = await supabase.auth.updateUser({
  password: 'NewPassword456'
})
```

**Note:** Password change is managed entirely by Supabase Auth. No custom API endpoint needed

---

### 4.3 Delete Account

**DELETE** `/api/users/me`

Delete authenticated user's account and all associated data (briefs, comments).

**Headers:**
- `Authorization: Bearer {token}`

**Success Response (204 No Content)**

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token

---

## 5. Brief Endpoints

### 5.1 List Briefs ✅ IMPLEMENTED

**GET** `/api/briefs`

Retrieve paginated list of briefs (owned and shared with user).

**Implementation Status:**
- ✅ Route Handler: [src/app/api/briefs/route.ts](../src/app/api/briefs/route.ts)
- ✅ Service Layer: [src/lib/services/brief.service.ts](../src/lib/services/brief.service.ts) (`getBriefs`)
- ✅ Validation Schema: [src/lib/schemas/brief.schema.ts](../src/lib/schemas/brief.schema.ts) (`BriefQuerySchema`)
- ⚠️ **Development Mode**: Currently uses DEFAULT_USER_PROFILE (auth not implemented yet)

**Headers:**
- `Authorization: Bearer {token}` (not validated in development mode)

**Query Parameters:**
- `page`: Number (default: 1) - Page number
- `limit`: Number (default: 10, max: 50) - Items per page
- `filter`: String (optional) - `"owned"` | `"shared"` - Filter by ownership
- `status`: String (optional) - `"draft"` | `"sent"` | `"accepted"` | `"rejected"` | `"needs_modification"` - Filter by status

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "ownerId": "uuid",
      "header": "Project Brief Title",
      "footer": "Contact info",
      "status": "sent",
      "commentCount": 3,
      "isOwned": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T11:00:00Z"
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

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or expired token (when auth is implemented)

---

### 5.2 Get Brief Details ✅ IMPLEMENTED

**GET** `/api/briefs/:id`

Retrieve full details of a specific brief.

**Implementation Status:**
- ✅ Route Handler: [src/app/api/briefs/[id]/route.ts](../src/app/api/briefs/[id]/route.ts)
- ✅ Service Layer: [src/lib/services/brief.service.ts](../src/lib/services/brief.service.ts) (`getBriefById`)
- ✅ Validation Schema: [src/lib/schemas/brief.schema.ts](../src/lib/schemas/brief.schema.ts) (`BriefIdSchema`)
- ✅ Authorization: Enforces owner or recipient access
- ⚠️ **Development Mode**: Currently uses DEFAULT_USER_PROFILE (auth not implemented yet)

**Headers:**
- `Authorization: Bearer {token}` (not validated in development mode)

**Path Parameters:**
- `id`: UUID - Brief identifier

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "ownerId": "uuid",
  "header": "Project Brief Title",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Brief content in TipTap format"
          }
        ]
      }
    ]
  },
  "footer": "Contact info",
  "status": "sent",
  "statusChangedAt": "2025-01-15T10:35:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 3,
  "isOwned": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid brief ID format
- `401 Unauthorized`: Invalid or expired token (when auth is implemented)
- `403 Forbidden`: User does not have access to this brief
- `404 Not Found`: Brief does not exist

---

### 5.3 Create Brief

**POST** `/api/briefs`

Create a new brief (creators only).

**Headers:**
- `Authorization: Bearer {token}`

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

**Validation:**
- `header`: Required, string, 1-200 characters
- `content`: Required, valid TipTap JSON structure
- `footer`: Optional, string, max 200 characters

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "ownerId": "uuid",
  "header": "Project Brief Title",
  "content": { /* TipTap JSON */ },
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
- `400 Bad Request`: Validation errors
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "header",
        "message": "Header must be between 1 and 200 characters"
      }
    ]
  }
  ```
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User role is not 'creator' or brief limit (20) reached
  ```json
  {
    "error": "Brief limit of 20 reached. Please delete old briefs to create new ones."
  }
  ```

---

### 5.4 Update Brief

**PATCH** `/api/briefs/:id`

Update brief content (owner) or status (client with access).

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier

**Request Body (Owner - Content Update):**
```json
{
  "header": "Updated Title",
  "content": { /* Updated TipTap JSON */ },
  "footer": "Updated footer"
}
```

**Request Body (Client - Status Update):**
```json
{
  "status": "accepted"
}
```

```json
{
  "status": "needs_modification",
  "comment": "Please add more details about the timeline"
}
```

**Validation:**

**For owners (creators):**
- `header`: Optional, string, 1-200 characters
- `content`: Optional, valid TipTap JSON structure
- `footer`: Optional, string, max 200 characters or null
- Cannot update `status` directly (resets to `draft` automatically via database trigger when content is modified)

**For recipients (clients):**
- `status`: Optional, enum: `accepted` | `rejected` | `needs_modification`
- `comment`: Required if `status` is `needs_modification`, string, 1-1000 characters
- Cannot update `header`, `content`, or `footer`

**Business Logic:**
- **Owner updates:** Changing `header`/`content`/`footer` triggers automatic status reset to `draft` (database trigger)
- **Client status updates:** Must have brief access, current brief status must be `sent`
- **Status `needs_modification`:** Automatically creates comment with provided content

**Success Response (200 OK) - Content Update:**
```json
{
  "id": "uuid",
  "ownerId": "uuid",
  "header": "Updated Title",
  "content": { /* Updated TipTap JSON */ },
  "footer": "Updated footer",
  "status": "draft",
  "statusChangedAt": "2025-01-15T11:00:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 3,
  "isOwned": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

**Success Response (200 OK) - Status Update:**
```json
{
  "id": "uuid",
  "status": "accepted",
  "statusChangedAt": "2025-01-15T11:00:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 3,
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

**Success Response (200 OK) - Status Update with Comment:**
```json
{
  "id": "uuid",
  "status": "needs_modification",
  "statusChangedAt": "2025-01-15T11:00:00Z",
  "statusChangedBy": "uuid",
  "commentCount": 4,
  "updatedAt": "2025-01-15T11:00:00Z",
  "comment": {
    "id": "uuid",
    "briefId": "uuid",
    "authorId": "uuid",
    "content": "Please add more details about the timeline",
    "createdAt": "2025-01-15T11:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
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
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`:
  - Client trying to update content fields
  - Owner trying to update status directly
  - Client trying to update status when brief is not in `sent` state
  - User without brief access
  ```json
  {
    "error": "Only clients with access can change brief status when it's in 'sent' state"
  }
  ```
- `404 Not Found`: Brief does not exist

---

### 5.5 Delete Brief

**DELETE** `/api/briefs/:id`

Permanently delete a brief (owner only).

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier

**Success Response (204 No Content)**

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User is not the owner
- `404 Not Found`: Brief does not exist

---

## 6. Brief Recipient Endpoints

### 6.1 List Brief Recipients

**GET** `/api/briefs/:id/recipients`

Retrieve list of users with access to the brief (owner only).

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "recipientId": "uuid",
      "recipientEmail": "client@example.com",
      "sharedBy": "uuid",
      "sharedAt": "2025-01-15T10:35:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User is not the brief owner
- `404 Not Found`: Brief does not exist

---

### 6.2 Share Brief with Recipient

**POST** `/api/briefs/:id/recipients`

Share brief with a user by email (owner only, max 10 recipients, changes status to 'sent').

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier

**Request Body:**
```json
{
  "email": "client@example.com"
}
```

**Validation:**
- `email`: Required, valid email format, user must exist in system

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "briefId": "uuid",
  "recipientId": "uuid",
  "recipientEmail": "client@example.com",
  "sharedBy": "uuid",
  "sharedAt": "2025-01-15T10:35:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email or user not found
  ```json
  {
    "error": "User with email 'client@example.com' not found"
  }
  ```
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User is not the brief owner or recipient limit (10) reached
  ```json
  {
    "error": "Maximum of 10 recipients per brief exceeded"
  }
  ```
- `404 Not Found`: Brief does not exist
- `409 Conflict`: Recipient already has access
  ```json
  {
    "error": "User already has access to this brief"
  }
  ```

---

### 6.3 Revoke Recipient Access

**DELETE** `/api/briefs/:id/recipients/:recipientId`

Remove user's access to brief (owner only, resets status to 'draft' if last recipient).

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier
- `recipientId`: UUID - Recipient user identifier

**Success Response (204 No Content)**

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User is not the brief owner
- `404 Not Found`: Brief or recipient access does not exist

---

## 7. Comment Endpoints

### 7.1 List Comments

**GET** `/api/briefs/:id/comments`

Retrieve all comments for a brief (users with access only).

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "briefId": "uuid",
      "authorId": "uuid",
      "authorEmail": "user@example.com",
      "authorRole": "client",
      "content": "This looks good, but can we adjust the timeline?",
      "isOwn": false,
      "createdAt": "2025-01-15T10:45:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User does not have access to this brief
- `404 Not Found`: Brief does not exist

---

### 7.2 Create Comment

**POST** `/api/briefs/:id/comments`

Add a comment to a brief (users with access only).

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Brief identifier

**Request Body:**
```json
{
  "content": "This looks good, but can we adjust the timeline?"
}
```

**Validation:**
- `content`: Required, string, 1-1000 characters

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "briefId": "uuid",
  "authorId": "uuid",
  "authorEmail": "user@example.com",
  "authorRole": "client",
  "content": "This looks good, but can we adjust the timeline?",
  "isOwn": true,
  "createdAt": "2025-01-15T10:45:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "content",
        "message": "Comment must be between 1 and 1000 characters"
      }
    ]
  }
  ```
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User does not have access to this brief
- `404 Not Found`: Brief does not exist

---

### 7.3 Delete Comment

**DELETE** `/api/comments/:id`

Delete own comment.

**Headers:**
- `Authorization: Bearer {token}`

**Path Parameters:**
- `id`: UUID - Comment identifier

**Success Response (204 No Content)**

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `403 Forbidden`: User is not the comment author
- `404 Not Found`: Comment does not exist

---

## 8. Authentication and Authorization

### 8.1 Authentication Mechanism

**Implementation**: Supabase Auth with JWT tokens

**Flow:**
1. User registers or logs in via **Supabase Auth SDK** (client-side)
2. Supabase returns access token (JWT) and refresh token
3. Client stores tokens securely (handled automatically by Supabase SDK)
4. Client includes access token in `Authorization` header for API requests
5. Server validates JWT using Supabase's `getUser()` method
6. Token refresh handled automatically by Supabase SDK

**Server-side validation (Next.js API routes):**
```typescript
import { createSupabaseServerClient } from '@/db/supabase.server'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // User is authenticated, proceed with request
  // Access user ID: user.id
  // Access user email: user.email

  // Get role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Access role: profile?.role
}
```

**Token Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Payload (Supabase JWT):**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "user_metadata": {
    "role": "creator"
  },
  "iat": 1642248000,
  "exp": 1642251600,
  "role": "authenticated"
}
```

### 8.2 Authorization Rules

**Role-Based Access:**
- **Creators**: Can create briefs, share briefs, manage recipients, edit/delete own briefs
- **Clients**: Can view shared briefs, add comments, change brief status (accept/reject/needs modification)

**Resource-Based Access:**
- Users can only access briefs they own or have been shared with
- Users can only edit/delete their own briefs
- Users can only delete their own comments
- Brief owners can manage recipients

**Implementation**:
- Leverages Supabase Row Level Security (RLS) policies defined in database schema
- API endpoints trust RLS and use authenticated user context (`auth.uid()`) for all queries
- Helper function `user_has_brief_access(brief_id)` checks ownership or recipient status

### 8.3 Session Management

**Managed by Supabase Auth:**
- Configurable session lifetime (default: 1 hour for access token)
- Refresh tokens valid for 7 days (configurable)
- Automatic token refresh via Supabase SDK
- Single active session per user (configurable in Supabase dashboard)
- Logout via `supabase.auth.signOut()` invalidates session
- Account deletion invalidates all sessions automatically

---

## 9. Validation and Business Logic

### 9.1 Field Validation Rules

**User Registration:**
- Email: Valid email format, unique in system
- Password: Min 8 characters, at least one digit (regex: `/^(?=.*\d).{8,}$/`)
- Role: Enum (`creator` | `client`)

**Brief Creation/Update:**
- Header: Required, 1-200 characters
- Content: Required, valid TipTap JSON structure (type: "doc")
- Footer: Optional, max 200 characters

**Comment:**
- Content: Required, 1-1000 characters

**Password Change:**
- Current password: Required, must match existing
- New password: Min 8 characters, at least one digit, different from current

### 9.2 Business Logic Rules

**Brief Limits:**
- Creators can have max 20 active briefs (enforced by database trigger)
- Each brief can be shared with max 10 recipients (enforced by database trigger)
- API returns `403 Forbidden` when limits are reached

**Status Workflow:**
1. New briefs start in `draft` status
2. Sharing brief with first recipient changes status to `sent` (database trigger)
3. Clients can change status: `sent` → `accepted` | `rejected` | `needs_modification`
4. Editing brief content/header/footer resets status to `draft` (database trigger)
5. Removing all recipients resets status to `draft` (database trigger)
6. Status `needs_modification` requires a comment

**Comment Count:**
- Denormalized `comment_count` field on briefs table
- Automatically incremented/decremented by database triggers
- Used for efficient pagination and display

**Cascading Deletes:**
- Deleting brief → deletes all comments and recipient relationships
- Deleting user → deletes all owned briefs, comments, and recipient relationships
- All deletions are hard deletes with audit trail (logged to `audit_log` table)

**Access Control:**
- Brief owner can: view, edit, delete, share, revoke access
- Brief recipient can: view, comment, change status
- Only creators can create briefs
- Only clients can accept/reject/request modification

### 9.3 Error Handling Strategy

**Validation Errors (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "header",
      "message": "Header must be between 1 and 200 characters"
    },
    {
      "field": "content",
      "message": "Content is required"
    }
  ]
}
```

**Authentication Errors (401 Unauthorized):**
```json
{
  "error": "Invalid or expired token"
}
```

**Authorization Errors (403 Forbidden):**
```json
{
  "error": "You do not have permission to perform this action"
}
```

**Resource Not Found (404 Not Found):**
```json
{
  "error": "Resource not found"
}
```

**Conflict Errors (409 Conflict):**
```json
{
  "error": "Resource already exists"
}
```

**Server Errors (500 Internal Server Error):**
```json
{
  "error": "An unexpected error occurred"
}
```

---

## 10. Performance Considerations

### 10.1 Pagination

All list endpoints support pagination:
- Default page size: 10 items
- Max page size: 50 items
- Query parameters: `page` (1-based), `limit`
- Response includes pagination metadata

### 10.2 Database Optimization

- Composite indexes on `(owner_id, updated_at DESC)` for brief lists
- Index on `recipient_id` for shared brief queries
- Index on `(brief_id, created_at DESC)` for comment chronological display
- Denormalized `comment_count` eliminates COUNT() queries
- RLS policies use indexed columns for performance

### 10.3 Caching Strategy

- Brief lists can be cached with short TTL (30-60 seconds)
- Brief details can be cached until updated
- Comments can be cached until new comment added
- Cache invalidation on create/update/delete operations

---

## 11. GDPR Compliance

### 11.1 Right to Access

- `GET /api/users/me` - User can access their profile data
- `GET /api/briefs` - User can access all their briefs
- Audit log tracks all operations on user data (database-level)

### 11.2 Right to Deletion

- `DELETE /api/users/me` - Hard delete account and all associated data
- Cascading delete: briefs, comments, recipient relationships
- Pre-deletion archival to `audit_log` table (database trigger)
- Email becomes available for re-registration
- All sessions invalidated

### 11.3 Data Minimization

- Profile stores only essential fields: id, role, timestamps
- No unnecessary personal data collection
- Email stored in Supabase Auth (encrypted at rest)

---

## 12. Rate Limiting

### 12.1 Limits (Recommended for Production)

- Authentication endpoints: 5 requests/minute per IP
- Brief creation: 10 requests/minute per user
- Comment creation: 20 requests/minute per user
- General API: 100 requests/minute per user

### 12.2 Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

### 12.3 Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 42
}
```

---

## 13. API Versioning

### 13.1 Strategy

- URL-based versioning (future): `/api/v2/briefs`
- Current version (MVP): No version prefix (implicit v1)
- Breaking changes require new version
- Non-breaking changes can be added to existing version

### 13.2 Deprecation Policy

- 6-month notice for deprecated endpoints
- Documentation includes deprecation warnings
- Response header: `X-API-Deprecated: true`

---

## 14. Summary of Endpoints

### Authentication (Handled by Supabase)
Authentication is **entirely managed by Supabase Auth** using the client-side SDK. No custom API endpoints needed for:
- Registration: `supabase.auth.signUp()`
- Login: `supabase.auth.signInWithPassword()`
- Logout: `supabase.auth.signOut()`
- Password reset: `supabase.auth.resetPasswordForEmail()`
- Token refresh: Automatic via SDK

### Custom API Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/users/me` | Get current user profile | Yes | Any |
| DELETE | `/api/users/me` | Delete account | Yes | Any |
| GET | `/api/briefs` | List briefs (paginated) | Yes | Any |
| GET | `/api/briefs/:id` | Get brief details | Yes | Any* |
| POST | `/api/briefs` | Create brief | Yes | Creator |
| PATCH | `/api/briefs/:id` | Update brief content or status | Yes | Creator** / Client* |
| DELETE | `/api/briefs/:id` | Delete brief | Yes | Creator** |
| GET | `/api/briefs/:id/recipients` | List recipients | Yes | Creator** |
| POST | `/api/briefs/:id/recipients` | Share brief | Yes | Creator** |
| DELETE | `/api/briefs/:id/recipients/:recipientId` | Revoke access | Yes | Creator** |
| GET | `/api/briefs/:id/comments` | List comments | Yes | Any* |
| POST | `/api/briefs/:id/comments` | Create comment | Yes | Any* |
| DELETE | `/api/comments/:id` | Delete comment | Yes | Any*** |

**Total: 14 custom API endpoints** (authentication + profile creation handled by Supabase)

**Note:** The `PATCH /api/briefs/:id` endpoint serves dual purpose:
- **Creators** can update brief content (`header`, `content`, `footer`)
- **Clients** can update brief status (`accepted`, `rejected`, `needs_modification`)

**Legend:**
- `*` = Must have access to the brief (owner or recipient)
- `**` = Must be the brief owner
- `***` = Must be the comment author

---

## 15. Next Steps for Implementation

### Phase 1: Setup & Configuration
1. **Configure Supabase project**
   - Set up authentication providers in Supabase dashboard
   - Configure email templates for auth flows
   - Set session timeout and refresh token policies

2. **Set up Supabase clients** in Next.js ✅ ALREADY DONE
   - ✅ Installed `@supabase/ssr`
   - ✅ Created client-side client (`src/db/supabase.client.ts`)
   - ✅ Created server-side client (`src/db/supabase.server.ts`)
   - ✅ Generated TypeScript types (`src/db/database.types.ts`)

3. **Implement database schema**
   - Run migrations in Supabase
   - Set up RLS policies
   - Configure triggers and functions

### Phase 2: Authentication Integration
4. **Set up profile creation trigger** ✅ DONE IN DB-PLAN.MD
   - ✅ Database trigger `create_profile_for_new_user` automatically creates profile
   - ✅ Extracts role from `raw_user_meta_data->>'role'`
   - ✅ Defaults to 'client' if not specified
   - ✅ Logs registration to audit_log

5. **Implement auth middleware**
   - Create middleware to validate Supabase JWT
   - Extract user context for API routes
   - Handle unauthorized access

### Phase 3: API Development
6. **Implement Zod validation schemas** ✅ IN PROGRESS
   - ✅ Brief validation schemas created in [src/lib/schemas/brief.schema.ts](../src/lib/schemas/brief.schema.ts)
     - `BriefQuerySchema` - Validates GET /api/briefs query parameters (page, limit, filter, status)
     - `BriefIdSchema` - Validates UUID format for brief ID parameters
   - ⏳ TODO: Schemas for create/update brief operations
   - ⏳ TODO: Comment validation schemas
   - ⏳ TODO: Recipient validation schemas

7. **Create service layer** in `src/lib/services/` ✅ IN PROGRESS
   - ✅ Error handling system with custom ApiError classes ([src/lib/errors/](../src/lib/errors/))
     - `ApiError` - Base class with statusCode and error code
     - `UnauthorizedError` (401) - Authentication failures
     - `ForbiddenError` (403) - Permission issues
     - `NotFoundError` (404) - Resource not found
     - `ValidationError` (400) - Input validation failures
     - `DatabaseError` (500) - Database operations
     - `ConflictError` (409) - Resource conflicts
   - ✅ `userService.ts` - User profile operations (development mode with DEFAULT_USER_PROFILE)
   - ✅ `briefService.ts` - Brief read operations (`getBriefs`, `getBriefById`) implemented
   - ⏳ `briefService.ts` - Brief write operations (create, update, delete) - TODO
   - ⏳ `recipientService.ts` - Sharing logic - TODO
   - ⏳ `commentService.ts` - Comment operations - TODO
   - All services use authenticated Supabase client with RLS

8. **Build API Route Handlers** in `src/app/api/` ✅ IN PROGRESS
   - ✅ User endpoints: `users/me/route.ts` (GET implemented)
   - ✅ Brief endpoints: `briefs/route.ts` (GET implemented with pagination & filters)
   - ✅ Brief endpoints: `briefs/[id]/route.ts` (GET implemented with authorization)
   - ⏳ Brief endpoints: `briefs/route.ts` (POST for create) - TODO
   - ⏳ Brief endpoints: `briefs/[id]/route.ts` (PATCH handles both content and status updates) - TODO
   - ⏳ Brief endpoints: `briefs/[id]/route.ts` (DELETE) - TODO
   - ⏳ Recipient endpoints: `briefs/[id]/recipients/route.ts` - TODO
   - ⏳ Comment endpoints: `briefs/[id]/comments/route.ts`, `comments/[id]/route.ts` - TODO

### Phase 4: Error Handling & Testing
9. **Add consistent error handling**
   - Create error response utilities
   - Implement proper HTTP status codes
   - Add validation error formatting

10. **Write integration tests**
    - Test authentication flows with Supabase
    - Test all API endpoints with different roles
    - Test RLS policies

### Phase 5: Production Readiness
11. **Set up rate limiting** (optional for MVP)
    - Use Vercel rate limiting or upstash/redis
    - Configure limits per endpoint

12. **Configure monitoring**
    - Set up Sentry or similar for error tracking
    - Configure Supabase dashboard alerts
    - Add logging for critical operations

13. **API Documentation**
    - Generate OpenAPI spec from this plan
    - Set up Swagger UI (optional)
    - Document Supabase auth flows for frontend team

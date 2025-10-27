# Supabase Client Type Convention

## Problem

Previously, every service had to duplicate code to create the `SupabaseClient` type:

```typescript
// ❌ Duplicated code in every service
import type { createSupabaseServerClient } from '@/db/supabase.server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
```

## Solution

The `SupabaseClient` type has been centralized in [src/types.ts](../src/types.ts) and can now be imported directly:

```typescript
// ✅ Single import, no duplication
import type { SupabaseClient } from '@/types'
```

## Implementation

In [src/types.ts](../src/types.ts):

```typescript
import type { createSupabaseServerClient } from "@/db/supabase.server";

/**
 * Supabase client type inferred from createSupabaseServerClient helper
 * Use this type instead of importing SupabaseClient from @supabase/supabase-js
 *
 * @example
 * import type { SupabaseClient } from '@/types'
 *
 * async function getUserProfile(supabase: SupabaseClient, userId: string) {
 *   // ...
 * }
 */
export type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
```

## Usage in Services

### Example 1: User Service

```typescript
// src/lib/services/user.service.ts
import type { SupabaseClient, UserProfileDto } from '@/types'

/**
 * Retrieves a user's profile by their ID
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileDto | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return null
  }

  // Transform to DTO...
  return {
    id: profile.id,
    role: profile.role,
    email: user.email || '',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  }
}
```

### Example 2: Brief Service

```typescript
// src/lib/services/brief.service.ts
import type {
  SupabaseClient,
  BriefListItemDto,
  PaginatedResponse,
  BriefQueryParams
} from '@/types'

/**
 * Retrieves paginated list of briefs accessible to user
 */
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  // Implementation...
}
```

## Benefits

1. **DRY (Don't Repeat Yourself)**: Type defined in one place
2. **Easier maintenance**: Changes to the type require modification in only one place
3. **Consistency**: All services use the same type
4. **Simpler documentation**: Less code to explain in implementation plans
5. **Rule compliance**: Adheres to the "Never import `SupabaseClient` directly from `@supabase/supabase-js`" rule

## Backend Rules

According to [.claude/rules/backend.mdc](../.claude/rules/backend.mdc):

- ✅ Import `SupabaseClient` from `@/types`
- ❌ DO NOT import `SupabaseClient` from `@supabase/supabase-js`
- ✅ Use `await createSupabaseServerClient()` in Server Components/Route Handlers
- ✅ Use `createSupabaseBrowserClient()` in Client Components

## Migrating Existing Code

If you have existing code with a duplicated type:

**Before:**
```typescript
import type { createSupabaseServerClient } from '@/db/supabase.server'
import type { Database } from '@/db/database.types'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function myFunction(supabase: SupabaseClient) {
  // ...
}
```

**After:**
```typescript
import type { SupabaseClient } from '@/types'

export async function myFunction(supabase: SupabaseClient) {
  // ...
}
```

## See Also

- [src/types.ts](../src/types.ts) - Definition of all DTO and helper types
- [src/db/supabase.server.ts](../src/db/supabase.server.ts) - Helper function for server-side
- [src/db/supabase.client.ts](../src/db/supabase.client.ts) - Helper function for client-side
- [.claude/rules/backend.mdc](../.claude/rules/backend.mdc) - Backend rules

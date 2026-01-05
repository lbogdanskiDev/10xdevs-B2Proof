---
description:
globs: src/db/*.ts,src/middleware/*.ts,src/lib/*.ts,src/app/api/**/*.ts
alwaysApply: false
---

### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Use `@supabase/ssr` package for Next.js 15 integration with automatic cookie management
- In Server Components, Route Handlers, and Server Actions: use `await createSupabaseServerClient()` from `src/db/supabase.server.ts` (async function)
- In Client Components: use `createSupabaseBrowserClient()` from `src/db/supabase.client.ts` (sync function)
- Import `Database` type from `src/db/database.types.ts` for type-safe database queries
- Never import `SupabaseClient` or `createClient` directly from `@supabase/supabase-js` - always use the helper functions above
- For type annotations in services: import `SupabaseClient` type from `@/types` (centralized type definition)
- Use request headers or cookies to pass data between middleware and route handlers
- In middleware, use `request.cookies` and `response.cookies` to manage cookies; in Route Handlers use `cookies()` from `next/headers`
- Supabase session is automatically managed via cookies through `@supabase/ssr` - no need to manually store user data in context

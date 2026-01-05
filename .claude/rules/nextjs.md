---
description:
globs: *.tsx,*.ts,*.jsx,*.js
alwaysApply: false
---

### Guidelines for Next.js

- Use App Router for all features and pages (located in `src/app/`)
- Leverage Server Actions for form handling and mutations with `'use server'` directive
- Use Route Handlers in `src/app/api/` for external API endpoints (file name: `route.ts`)
- Use POST, GET - uppercase format for Route Handler methods
- Use zod for input validation in Route Handlers and Server Actions
- Extract business logic into services in `src/lib/services`
- Implement middleware in `src/middleware.ts` for request/response modification
- Use Next.js Image component for automatic image optimization
- Leverage Server Components by default, use Client Components only when interactivity is needed
- **Always await `cookies()` and `headers()` from 'next/headers' - they return Promises in Next.js 15**
- **Cookies can only be modified in Server Actions or Route Handlers, not in Server Components**
- Use `process.env` for environment variables (prefix with `NEXT_PUBLIC_` for client-side access)
- Use file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Consider using the new `<Form>` component from 'next/form' for client-side navigation with progressive enhancement
- Leverage Partial Prerendering with Suspense boundaries for optimal streaming performance
- Use TypeScript config file `next.config.ts` instead of `.js` for better type safety
- Organize code structure: avoid putting everything in `app/`, use `src/lib` for utilities and `src/components` for reusable components
- For complex forms, use `Object.fromEntries(formData)` to extract all fields at once
- Remember Server Actions use POST method and have built-in CSRF protection
- Use `revalidatePath()` or `revalidateTag()` before `redirect()` in Server Actions for cache updates
- Set cookies with proper security options: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`

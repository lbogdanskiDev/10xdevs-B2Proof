---
description:
globs:
alwaysApply: false
---
# Supabase Auth Integration with Next.js 15

Use this guide to introduce authentication (sign-up & sign-in) in Next.js 15 applications with App Router and Server Components.

## Before we start

VERY IMPORTANT: Ask me which pages or components should behave differently after introducing authentication. Adjust further steps accordingly.

## Core Requirements

1. Use `@supabase/ssr` package (NOT auth-helpers)
2. Use ONLY `getAll` and `setAll` for cookie management
3. NEVER use individual `get`, `set`, or `remove` cookie methods
4. Implement proper session management with middleware based on JWT (Supabase Auth)
5. Use Server Components by default, Client Components only when interactivity is needed

## Installation

```bash
npm install @supabase/ssr @supabase/supabase-js
```

## Environment Variables

Create `.env.local` file with required Supabase credentials (based on the snippet below or `.env.example` in project root)

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Make sure `.env.example` is updated with the correct environment variables.

## Implementation Steps

### 1. Create Supabase Client Utilities

Create utilities for different contexts in `src/db/`:

#### Server Client (for Server Components, Route Handlers, Server Actions)

Update existing Supabase client or create one in `src/db/supabase.server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

#### Client for Middleware

Create `src/db/supabase.middleware.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from './database.types';

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
```

#### Browser Client (for Client Components)

Create `src/db/supabase.browser.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 2. Implement Authentication Middleware

Create or update `src/middleware.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from './db/supabase.middleware';

// Public paths - Auth pages & API endpoints
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/auth/callback',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseMiddlewareClient(request, response);

  // IMPORTANT: Always refresh session to keep it valid
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login for protected routes if not authenticated
  if (!user && !PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 3. Create Auth API Route Handlers

Create the following Route Handlers in `src/app/api/auth/`:

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/db/supabase.server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user });
}
```

```typescript
// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/db/supabase.server';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user });
}
```

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/db/supabase.server';

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

### 4. Access User in Server Components

```typescript
// src/app/dashboard/page.tsx
import { createSupabaseServerClient } from '@/db/supabase.server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Welcome {user.email}!</p>
    </main>
  );
}
```

### 5. Access User in Client Components

```typescript
// src/components/UserProfile.tsx
'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/db/supabase.browser';
import type { User } from '@supabase/supabase-js';

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!user) return null;

  return <p>Logged in as {user.email}</p>;
}
```

## Security Best Practices

- Set proper cookie options (httpOnly, secure, sameSite) - handled by @supabase/ssr
- Never expose Supabase service role key in client-side code
- Use `NEXT_PUBLIC_` prefix only for public environment variables
- Validate all user input server-side with Zod schemas
- Use proper error handling and logging
- Always use `getUser()` instead of `getSession()` for security (getUser validates JWT with Supabase)

## Common Pitfalls

1. DO NOT use individual cookie methods (get/set/remove)
2. DO NOT import from `@supabase/auth-helpers-nextjs` (deprecated)
3. DO NOT skip the `auth.getUser()` call in middleware
4. DO NOT use `getSession()` for auth checks (use `getUser()` - it validates the JWT)
5. DO NOT forget to `await cookies()` in Next.js 15 (it's now async)
6. Always handle auth state changes properly in Client Components
7. Remember that Server Components cannot use `onAuthStateChange` - use Client Components for reactive auth state

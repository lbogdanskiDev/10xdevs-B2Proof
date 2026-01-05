---
description:
globs:
alwaysApply: false
---

# Supabase Next.js Initialization

This document provides a reproducible guide to create the necessary file structure for integrating Supabase with your Next.js 15 project.

## Prerequisites

- Your project should use Next.js 15, TypeScript 5, React 19, and Tailwind 4.
- Install the `@supabase/supabase-js` and `@supabase/ssr` packages.
- Ensure that `/supabase/config.toml` exists
- Ensure that a file `/src/db/database.types.ts` exists and contains the correct type definitions for your database.

IMPORTANT: Check prerequisites before performing actions below. If they're not met, stop and ask a user for the fix.

## File Structure and Setup

### 1. Supabase Client Initialization (Server-Side)

Create the file `/src/db/supabase.server.ts` with the following content:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
```

This file creates a Supabase client for use in Server Components, Server Actions, and Route Handlers with automatic cookie management.

### 2. Supabase Client Initialization (Client-Side)

Create the file `/src/db/supabase.client.ts` with the following content:

```ts
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

This file creates a Supabase client for use in Client Components with automatic cookie management.

### 3. Middleware Setup

Create or update the file `/src/middleware.ts` with the following content:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
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
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

This middleware refreshes the authentication session on every request, ensuring the user's session is always up to date.

### 4. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
```

These are public environment variables that can be safely exposed to the browser (prefixed with `NEXT_PUBLIC_`).

### 5. TypeScript Type Export

Ensure your `/src/db/database.types.ts` exports a `Database` type. This file should be generated using the Supabase CLI:

```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

## Usage Examples

### In Server Components

```tsx
import { createSupabaseServerClient } from "@/db/supabase.server";

export default async function ServerComponent() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("your_table").select();

  return <div>{/* Your component */}</div>;
}
```

### In Server Actions

```tsx
'use server';

import { createSupabaseServerClient } from '@/db/supabase.server';

export async function myServerAction() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('your_table').insert({ ... });

  return data;
}
```

### In Route Handlers

```tsx
import { createSupabaseServerClient } from "@/db/supabase.server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("your_table").select();

  return NextResponse.json(data);
}
```

### In Client Components

```tsx
"use client";

import { createSupabaseBrowserClient } from "@/db/supabase.client";
import { useEffect, useState } from "react";

export default function ClientComponent() {
  const [data, setData] = useState(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from("your_table").select();
      setData(data);
    }
    loadData();
  }, []);

  return <div>{/* Your component */}</div>;
}
```

## Important Notes

- **Server Components** should use `createSupabaseServerClient()` - this is async
- **Client Components** should use `createSupabaseBrowserClient()` - this is sync
- **Route Handlers** and **Server Actions** should use `createSupabaseServerClient()`
- The middleware automatically refreshes sessions, so you don't need to manually check for expired tokens
- Always use environment variables prefixed with `NEXT_PUBLIC_` for values that need to be accessible in the browser

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_USER_PROFILE } from "./db/supabase.client";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Guard: Check if env vars are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // TODO: Replace with proper logging service (e.g., Sentry, Winston)
    // eslint-disable-next-line no-console
    console.error("[middleware] Missing Supabase environment variables");
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
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
  });

  // Get user session
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();

  const user = DEFAULT_USER_PROFILE;
  const { pathname } = request.nextUrl;

  // Redirect from home page based on auth state
  if (pathname === "/") {
    const redirectUrl = user ? "/briefs" : "/login";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Protect dashboard paths - redirect to /login if not authenticated
  const protectedPaths = ["/briefs", "/profile"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged-in users should not see /login
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/briefs", request.url));
  }

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

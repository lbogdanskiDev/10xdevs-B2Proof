import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseMiddlewareClient } from "@/db/supabase.middleware";
import { AUTH_CONSTANTS } from "@/lib/constants/auth.constants";

const { ROUTE_PROTECTION, ROUTES, URL_PARAMS } = AUTH_CONSTANTS;

/**
 * Checks if a pathname matches any path in the given list (prefix matching)
 */
function matchesPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Checks if pathname is exactly an auth page (login/register)
 */
function isAuthPage(pathname: string): boolean {
  return (ROUTE_PROTECTION.AUTH_PATHS as readonly string[]).includes(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response that will be modified with auth cookies
  const supabaseResponse = NextResponse.next({ request });

  // Initialize Supabase client with middleware context
  let supabase;
  try {
    supabase = createSupabaseMiddlewareClient(request, supabaseResponse);
  } catch {
    // Missing env vars - allow request to continue (will fail later with better error)
    // eslint-disable-next-line no-console
    console.error("[middleware] Failed to create Supabase client - missing env vars");
    return supabaseResponse;
  }

  // Get user - validates JWT with Supabase Auth
  // IMPORTANT: Always call getUser() to refresh session cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle home page redirect based on auth state
  if (pathname === ROUTES.HOME) {
    const redirectUrl = user ? ROUTES.BRIEFS : ROUTES.LOGIN;
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Protect routes - redirect to login if not authenticated
  const isProtectedPath = matchesPath(pathname, ROUTE_PROTECTION.PROTECTED_PATHS);

  if (isProtectedPath && !user) {
    const loginUrl = new URL(ROUTE_PROTECTION.DEFAULT_UNAUTHENTICATED_REDIRECT, request.url);
    // Preserve original destination for post-login redirect
    loginUrl.searchParams.set(URL_PARAMS.REDIRECT_TO, pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage(pathname) && user) {
    return NextResponse.redirect(new URL(ROUTE_PROTECTION.DEFAULT_AUTHENTICATED_REDIRECT, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

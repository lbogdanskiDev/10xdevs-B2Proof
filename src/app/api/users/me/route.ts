import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { getUserProfile, deleteUserAccount } from "@/lib/services/user.service";
import { ApiError } from "@/lib/errors";
import type { UserProfileDto, ErrorResponse } from "@/types";

/**
 * GET /api/users/me
 * Retrieves the authenticated user's profile
 *
 * TODO: Current implementation returns DEFAULT_USER_PROFILE for development
 * Future implementation will:
 * 1. Validate JWT token from Authorization header
 * 2. Authenticate via Supabase Auth
 * 3. Fetch real user data from database
 * 4. Handle 401 (Unauthorized), 404 (Not Found), 500 (Server Error)
 */
export async function GET() {
  try {
    // TODO: Add authentication when ready
    // Current: Returns mock user profile for development

    // Fetch user profile (currently returns DEFAULT_USER_PROFILE)
    const profile = await getUserProfile();

    // Happy path: Return profile
    return NextResponse.json<UserProfileDto>(profile, { status: 200 });
  } catch (error) {
    // Handle ApiError instances with proper status codes
    if (error instanceof ApiError) {
      // TODO: Replace with proper logging service (e.g., Sentry, Winston)
      // eslint-disable-next-line no-console
      console.error(`[GET /api/users/me] ${error.name}:`, error.message);
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // TODO: Replace with proper logging service (e.g., Sentry, Winston)
    // eslint-disable-next-line no-console
    console.error("[GET /api/users/me] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/me
 * Permanently deletes the authenticated user's account and all associated data
 *
 * Security:
 * - Requires valid JWT token (Authorization header)
 * - User can only delete their own account
 * - Creates audit log before deletion (GDPR compliance)
 *
 * Cascading Deletes (via database FK constraints):
 * - profiles
 * - briefs (owned)
 * - comments (authored)
 * - brief_recipients (as recipient or sharer)
 *
 * @returns 204 No Content on success
 */
export async function DELETE(): Promise<NextResponse<ErrorResponse> | NextResponse> {
  const supabase = await createSupabaseServerClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ErrorResponse>({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete user account and all associated data
  try {
    await deleteUserAccount(supabase, user.id);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error deleting user account:", error);

    // Check if user not found
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json<ErrorResponse>({ error: "User not found" }, { status: 404 });
    }

    // Generic server error
    return NextResponse.json<ErrorResponse>({ error: "Failed to delete account" }, { status: 500 });
  }

  // Return 204 No Content (no response body)
  return new NextResponse(null, { status: 204 });
}

// Configure route segment - disable caching for auth endpoints
export const dynamic = "force-dynamic";

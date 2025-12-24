import { NextResponse } from "next/server";
import { getUserProfile, deleteUserAccount } from "@/lib/services/user.service";
import { getAuthContext, handleApiError, errorResponse } from "@/lib/utils/api-handler.utils";
import type { UserProfileDto, ErrorReturn } from "@/types";

/**
 * GET /api/users/me
 * Retrieves the authenticated user's profile
 */
export async function GET() {
  try {
    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase } = auth.data;

    // Get profile via service
    const profile = await getUserProfile(supabase);

    return NextResponse.json<UserProfileDto>(profile, { status: 200 });
  } catch (error) {
    return handleApiError(error, "GET /api/users/me");
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
 */
export async function DELETE(): Promise<NextResponse<ErrorReturn> | NextResponse> {
  try {
    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;

    // Delete user account and all associated data
    await deleteUserAccount(supabase, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Special handling for "User not found" error
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json<ErrorReturn>({ error: "User not found" }, { status: 404 });
    }

    return handleApiError(error, "DELETE /api/users/me");
  }
}

// Configure route segment - disable caching for auth endpoints
export const dynamic = "force-dynamic";

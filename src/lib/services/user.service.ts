import type { UserProfileDto, SupabaseClient } from "@/types";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";

/**
 * Retrieves a user's profile
 *
 * TODO: This is a temporary implementation using DEFAULT_USER_PROFILE
 * Future implementation will:
 * 1. Authenticate user via Supabase Auth (getUser())
 * 2. Query profiles table by user ID
 * 3. Combine auth.users.email with profiles table data
 * 4. Handle errors with custom ApiError classes
 * 5. Validate user permissions and RLS policies
 *
 * @returns UserProfileDto with default user data
 */
export async function getUserProfile(): Promise<UserProfileDto> {
  // TODO: Replace with actual implementation when auth is ready
  // Current: Return mock data for development
  return DEFAULT_USER_PROFILE;
}

/**
 * Delete user account and all associated data
 *
 * Cascading deletes (via database FK constraints):
 * - profiles
 * - briefs (owned)
 * - comments (authored)
 * - brief_recipients (as recipient or sharer)
 * - audit_log entries (user_id set to NULL)
 *
 * @throws Error if deletion fails
 */
export async function deleteUserAccount(supabase: SupabaseClient, userId: string): Promise<void> {
  // Fetch user data for audit log before deletion
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("User not found");
  }

  // Get email from auth.users via admin API
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(userId);

  if (userError || !user) {
    throw new Error("User not found in auth system");
  }

  // Create audit log entry BEFORE deletion
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "user_deleted",
    entity_type: "user",
    entity_id: userId,
    old_data: {
      id: profile.id,
      role: profile.role,
      email: user.email,
      created_at: profile.created_at,
    },
    new_data: null,
  });

  if (auditError) {
    // eslint-disable-next-line no-console
    console.error("Failed to create audit log:", auditError);
    throw new Error("Failed to log account deletion");
  }

  // Delete user from auth.users (cascades to all related tables)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error("Failed to delete user:", deleteError);
    throw new Error("Failed to delete user account");
  }

  // eslint-disable-next-line no-console
  console.log(`User account deleted: ${userId}`);
}

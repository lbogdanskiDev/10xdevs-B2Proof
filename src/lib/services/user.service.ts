import type { UserProfileDto, SupabaseClient } from "@/types";
import { UnauthorizedError, NotFoundError } from "@/lib/errors/api-errors";
import { createSupabaseAdminClient } from "@/db/supabase.server";

/**
 * Retrieves a user's profile from the database
 *
 * @param supabase - Authenticated Supabase client
 * @returns UserProfileDto with user data
 * @throws UnauthorizedError if user is not authenticated
 * @throws NotFoundError if profile doesn't exist
 */
export async function getUserProfile(supabase: SupabaseClient): Promise<UserProfileDto> {
  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedError("Not authenticated");
  }

  // Fetch profile from database
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new NotFoundError("Profile not found");
  }

  return {
    id: profile.id,
    email: user.email ?? "",
    role: profile.role,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
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
  // Create admin client for operations requiring Service Role Key
  const adminClient = createSupabaseAdminClient();

  // Fetch user data for audit log before deletion
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("User not found");
  }

  // Get email from auth.users via admin API (requires Service Role Key)
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.admin.getUserById(userId);

  if (userError || !user) {
    throw new Error("User not found in auth system");
  }

  // Create audit log entry BEFORE deletion (use admin client to bypass RLS)
  const { error: auditError } = await adminClient.from("audit_log").insert({
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
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error("Failed to delete user:", deleteError);
    throw new Error("Failed to delete user account");
  }

  // eslint-disable-next-line no-console
  console.log(`User account deleted: ${userId}`);
}

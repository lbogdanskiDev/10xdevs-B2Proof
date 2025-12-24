/**
 * User Lookup Utilities
 *
 * Provides batch operations for fetching user information.
 * Reduces N+1 query patterns when enriching data with author details.
 */

import type { SupabaseClient, UserRole } from "@/types";

/**
 * Author information with email and role
 */
export interface AuthorInfo {
  email: string;
  role: UserRole;
}

/**
 * Batch fetch author information for multiple user IDs
 *
 * Optimizes N+1 queries by:
 * 1. Fetching all profiles in one query (for roles)
 * 2. Fetching all auth users in parallel (for emails)
 *
 * Performance comparison:
 * - Before: 1 + (N × 2) queries = 21 queries for 10 comments
 * - After: 1 + 1 + N queries = 12 queries for 10 comments (parallel)
 *
 * Note: Supabase Auth Admin API doesn't support batch user lookup,
 * so we still need N queries for emails, but they run in parallel.
 * For further optimization, consider creating a database view that
 * joins auth.users with profiles.
 *
 * @param supabase - Supabase client instance
 * @param authorIds - Array of user UUIDs to look up
 * @returns Map of userId to AuthorInfo (email + role)
 */
export async function batchGetAuthorInfo(
  supabase: SupabaseClient,
  authorIds: string[]
): Promise<Map<string, AuthorInfo>> {
  const uniqueIds = [...new Set(authorIds)];
  const result = new Map<string, AuthorInfo>();

  if (uniqueIds.length === 0) {
    return result;
  }

  // Fetch all profiles in one query (for roles)
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", uniqueIds);

  if (profilesError) {
    // eslint-disable-next-line no-console -- Utility layer logging for debugging
    console.error("[user-lookup] Failed to fetch profiles:", profilesError);
  }

  // Create role lookup map
  const roleMap = new Map<string, UserRole>();
  profiles?.forEach((p) => roleMap.set(p.id, p.role));

  // Fetch user emails in parallel
  // Note: Supabase Admin API doesn't support batch getUserById,
  // so we run individual queries in parallel
  const emailPromises = uniqueIds.map(async (id) => {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error) {
      // eslint-disable-next-line no-console -- Utility layer logging for debugging
      console.error(`[user-lookup] Failed to fetch user ${id}:`, error);
      return { id, email: "unknown@example.com" };
    }
    return { id, email: data?.user?.email ?? "unknown@example.com" };
  });

  const emailResults = await Promise.all(emailPromises);

  // Build result map combining role and email
  emailResults.forEach(({ id, email }) => {
    result.set(id, {
      email,
      role: roleMap.get(id) ?? "client",
    });
  });

  return result;
}

/**
 * Get single author info (convenience wrapper)
 *
 * Use batchGetAuthorInfo when fetching multiple authors.
 * This function is for single-author lookups only.
 *
 * @param supabase - Supabase client instance
 * @param authorId - User UUID to look up
 * @returns AuthorInfo with email and role
 */
export async function getAuthorInfo(supabase: SupabaseClient, authorId: string): Promise<AuthorInfo> {
  const map = await batchGetAuthorInfo(supabase, [authorId]);
  return map.get(authorId) ?? { email: "unknown@example.com", role: "client" };
}

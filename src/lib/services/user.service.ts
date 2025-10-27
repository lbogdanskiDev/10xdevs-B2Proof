import type { UserProfileDto } from "@/types";
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
  return {
    ...DEFAULT_USER_PROFILE,
    createdAt: DEFAULT_USER_PROFILE.createdAt.toISOString(),
    updatedAt: DEFAULT_USER_PROFILE.updatedAt.toISOString(),
  } as UserProfileDto;
}

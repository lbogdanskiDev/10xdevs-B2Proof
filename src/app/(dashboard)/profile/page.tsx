import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";

// TEMPORARY: Using mock user profile until Supabase Auth is implemented
// TODO: Replace with real authentication

export default function ProfilePage() {
  return <ProfilePageClient user={DEFAULT_USER_PROFILE} />;
}

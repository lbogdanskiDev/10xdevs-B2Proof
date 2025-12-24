import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/db/supabase.server";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import type { UserProfileDto } from "@/types";

async function getProfileData(): Promise<UserProfileDto | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch profile from database
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: profile.id,
    email: user.email ?? "",
    role: profile.role,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export default async function ProfilePage() {
  const user = await getProfileData();

  if (!user) {
    redirect("/login");
  }

  return <ProfilePageClient user={user} />;
}

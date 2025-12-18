import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";
import type { UserProfileDto } from "@/types";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

async function getUserProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<UserProfileDto | null> {
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

async function getBriefCount(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<number> {
  const { count, error } = await supabase.from("briefs").select("*", { count: "exact", head: true });

  if (error || count === null) {
    return 0;
  }

  return count;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createSupabaseServerClient();

  // Get user profile (server-side)
  // const user = await getUserProfile(supabase);
  const user = DEFAULT_USER_PROFILE;

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login");
  }

  // Get brief count for navigation
  const briefCount = await getBriefCount(supabase);

  return (
    <DashboardLayoutClient user={user} initialBriefCount={briefCount}>
      {children}
    </DashboardLayoutClient>
  );
}

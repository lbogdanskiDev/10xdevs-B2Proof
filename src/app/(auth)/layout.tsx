import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/db/supabase.server";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to /briefs if user is already logged in
  if (user) {
    redirect("/briefs");
  }

  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">{children}</div>;
}

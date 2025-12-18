import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export const DEFAULT_USER_PROFILE = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "demo@example.com",
  role: "creator" as const,
  createdAt: new Date("2024-01-15").toISOString(),
  updatedAt: new Date().toISOString(),
};

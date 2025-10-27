import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export const DEFAULT_USER_PROFILE = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
};

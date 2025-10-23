import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './database.types';

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}

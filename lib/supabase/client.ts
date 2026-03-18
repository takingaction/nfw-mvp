import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: true,
        detectSessionInUrl: true,
        lock: async (name, acquireTimeout, fn) => {
          return await fn();
        },
      },
    },
  );

  return client;
}

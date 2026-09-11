import "react-native-url-polyfill/auto";

import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";

import { env } from "@/lib/env";
import { secureStorage } from "@/lib/secureStorage";

/**
 * Supabase client for React Native.
 *
 * Differences from the web app's lib/supabase/client.ts:
 *  - Uses @supabase/supabase-js directly (no @supabase/ssr / cookies).
 *  - Session persisted via LargeSecureStore (see lib/secureStorage.ts).
 *  - `detectSessionInUrl: false` — deep-link callbacks are handled explicitly
 *    in app/auth/callback.tsx via exchangeCodeForSession / verifyOtp.
 *  - PKCE flow, required for mobile OAuth and email-link exchanges.
 *
 * The same Supabase project and custom auth domain (auth.nationalfundforwomen.org)
 * are used, so accounts are shared with the website.
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    lock: processLock,
  },
});

/**
 * Supabase only refreshes tokens while the app is foregrounded. Tell the client
 * when we move between foreground/background so refresh timers behave.
 * Call once from the root layout.
 */
export function bindSupabaseToAppState(): () => void {
  const handle = (state: AppStateStatus) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  };

  handle(AppState.currentState);
  const subscription = AppState.addEventListener("change", handle);
  return () => subscription.remove();
}

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

/**
 * Google OAuth via Supabase, PKCE flow, using the system browser (ASWebAuthenticationSession /
 * Custom Tabs). On completion Supabase redirects to `nfw://auth/callback?code=…`, which
 * app/auth/callback.tsx exchanges for a session.
 *
 * Setup required outside this repo:
 *  - Supabase Dashboard → Auth → URL Configuration → add `nfw://auth/callback`
 *  - Google Cloud Console → OAuth client → add iOS bundle ID / Android package
 */
export const AUTH_CALLBACK_URL = Linking.createURL("/auth/callback"); // nfw://auth/callback

export async function signInWithGoogle(next?: string): Promise<void> {
  const redirectTo = next
    ? `${AUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`
    : AUTH_CALLBACK_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true, // we open the browser ourselves
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Supabase did not return an OAuth URL");

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);

  // On iOS the auth session returns the callback URL directly; on Android the
  // OS opens the deep link and app/auth/callback.tsx handles it. Cover both.
  if (result.type === "success" && result.url) {
    await exchangeCodeFromUrl(result.url);
  }
}

/** Parse `?code=` (PKCE) from a callback URL and exchange it for a session. */
export async function exchangeCodeFromUrl(url: string): Promise<{ next: string | null }> {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : null;
  const next = typeof queryParams?.next === "string" ? queryParams.next : null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  return { next };
}

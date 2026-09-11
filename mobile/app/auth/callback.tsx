import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, theme } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

/**
 * Deep-link target: nfw://auth/callback
 *
 * Web equivalent:
 *   - app/auth/callback/route.ts (PKCE `code` exchange after OAuth / email confirm)
 *   - app/auth/confirm/route.ts  (`token_hash` + `type` verification for recovery / signup emails)
 * Build phase: 2
 *
 * Handles both shapes:
 *   ?code=…                              → exchangeCodeForSession
 *   ?token_hash=…&type=recovery|signup   → verifyOtp
 * then routes to `next` (validated to be an in-app path) or the dashboard.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>();
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (params.error) {
          throw new Error(params.error_description ?? params.error);
        }

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.token_hash && params.type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: params.token_hash,
            type: params.type as "recovery" | "signup" | "email" | "invite" | "magiclink" | "email_change",
          });
          if (error) throw error;
        } else {
          // Nothing to exchange — maybe the session was already set by openAuthSessionAsync.
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("No authentication code was provided.");
        }

        if (cancelled) return;

        const next = sanitizeNext(params.next) ?? defaultDestination(params.type);
        router.replace(next as never);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Authentication failed";
        setFailure(message);
        router.replace({ pathname: "/auth/error", params: { error: message } });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Params are stable for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.aubergine} />
      <Text style={styles.text}>{failure ? failure : "Signing you in…"}</Text>
    </View>
  );
}

/** Only allow relative in-app paths — never external URLs. */
function sanitizeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function defaultDestination(type: string | undefined): string {
  switch (type) {
    case "recovery":
      return "/auth/update-password";
    case "signup":
      return "/auth/sign-up/profile"; // web: /auth/sign-up?step=1
    default:
      return "/(tabs)/dashboard";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: theme.background,
  },
  text: { color: theme.textMuted, fontSize: 14 },
});

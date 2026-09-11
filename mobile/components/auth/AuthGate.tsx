import { useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/stores/auth";

/**
 * Route guard — mobile equivalent of proxy.ts + the per-page auth checks on web.
 *
 *  - Unauthenticated user inside (tabs) or /store → send to /auth/login
 *  - Authenticated user on /auth/login or /auth/sign-up (step 0) → send to dashboard
 *
 * Other /auth/* routes (callback, update-password, welcome, later signup steps)
 * are reachable while signed in and are left alone.
 *
 * Membership-tier gating (free approval, waitlist, incomplete profile) is
 * applied per-screen, matching the web's page-level checks.
 */
const PUBLIC_ENTRY_ROUTES = new Set(["login", "sign-up"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    const [first, second] = segments;
    const inAuthGroup = first === "auth";
    const inProtected = first === "(tabs)" || first === "store";

    if (status === "unauthenticated" && inProtected) {
      const next = "/" + segments.join("/");
      router.replace({ pathname: "/auth/login", params: { next } });
      return;
    }

    if (status === "authenticated" && inAuthGroup && second && PUBLIC_ENTRY_ROUTES.has(second)) {
      // Only redirect from sign-up step 0 (index); later steps are legit while signed in.
      const isSignupIndex = second === "sign-up" && segments.length === 2;
      if (second === "login" || isSignupIndex) {
        router.replace("/(tabs)/dashboard");
      }
    }
  }, [status, segments, router]);

  return <>{children}</>;
}

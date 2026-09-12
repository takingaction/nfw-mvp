import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthGate } from "@/components/auth/AuthGate";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { theme } from "@/constants/colors";
import { fontAssets } from "@/constants/fonts";
import { brandStackOptions } from "@/lib/navigation/stackOptions";
import { queryClient } from "@/lib/queryClient";
import { bindSupabaseToAppState } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

// Keep the native splash visible until fonts + session are ready.
void SplashScreen.preventAutoHideAsync();

/**
 * Root layout — mobile equivalent of app/layout.tsx on web.
 *
 *  - Provider tree (gesture handler, safe area, TanStack Query)
 *  - Brand fonts (Playfair Display + DM Sans via @expo-google-fonts)
 *  - Restore Supabase session from secure storage; subscribe to auth changes
 *  - Keep Supabase token refresh in sync with app foreground/background
 *  - Auth gate (components/auth/AuthGate.tsx)
 *  - Root stack: (tabs) · auth · store · misc root-level screens
 *
 *  - Push registration + notification tap routing (hooks/usePushNotifications)
 */
/** Renders nothing; hosts the push hook inside the navigation tree so useRouter is available. */
function PushBridge() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const status = useAuthStore((s) => s.status);
  const [authReady, setAuthReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    const unbindAppState = bindSupabaseToAppState();

    initialize()
      .then((unsub) => {
        unsubscribeAuth = unsub;
      })
      .catch((err) => console.error("[RootLayout] auth init failed", err))
      .finally(() => setAuthReady(true));

    return () => {
      unsubscribeAuth?.();
      unbindAppState();
    };
  }, [initialize]);

  useEffect(() => {
    if (fontError) console.warn("[RootLayout] font load failed; falling back to system fonts", fontError);
  }, [fontError]);

  const ready = authReady && status !== "loading" && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // splash still showing

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <PushBridge />
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                ...brandStackOptions,
                contentStyle: { backgroundColor: theme.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="store" options={{ headerShown: false }} />
              <Stack.Screen name="share-your-story" options={{ title: "Share Your Story" }} />
              <Stack.Screen name="contact" options={{ title: "Contact Us" }} />
              <Stack.Screen name="faq" options={{ title: "FAQ" }} />
              <Stack.Screen name="legal/[slug]" options={{ title: "Legal" }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

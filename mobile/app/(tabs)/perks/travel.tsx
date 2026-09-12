import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";

import { Button } from "@/components/ui/Button";
import { Body, Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError, apiPost } from "@/lib/api";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: app/travel/page.tsx + app/travel/TravelClient.tsx + POST /api/travel/token
 * Build phase: 7
 *
 * The Access Travel SDK only loads from whitelisted domains, so the WebView loads the thin
 * host page at {apiBaseUrl}/travel/embed?session_token=… (web route added in Slice F) rather
 * than local HTML. Tokens are 5-minute single-use: minted immediately before each load, and
 * re-minted when the page reports TRAVEL_CLIENT_SESSION_EXPIRED.
 */

/** Hosts allowed to navigate inside the WebView (SDK, maps, payment iframes). */
const IN_APP_HOSTS = [
  "nationalfundforwomen.org",
  "accessdevelopment.com",
  "accessdevelopment-stage.com",
  "adcrws.com",
  "adcrws-stage.com",
  "mapbox.com",
  "stripe.com",
  "braintreegateway.com",
  "braintree-api.com",
  "paypal.com",
  "paypalobjects.com",
];

function isInAppHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return IN_APP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return true; // about:blank, data:, etc.
  }
}

export default function TravelScreen() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const [uri, setUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);

  // Mint a fresh 5-minute token and (re)load the host page.
  const mint = useMutation({
    mutationFn: async () => {
      const [firstName, ...rest] = (profile?.full_name ?? "").trim().split(/\s+/);
      const { session_token } = await apiPost<{ session_token: string }>("/api/travel/token", {
        first_name: firstName || undefined,
        last_name: rest.join(" ") || undefined,
        email: user?.email ?? profile?.email ?? undefined,
      });
      return session_token;
    },
    onMutate: () => {
      setStatus("loading");
      setError(null);
    },
    onSuccess: (token) => setUri(`${env.apiBaseUrl}/travel/embed?session_token=${encodeURIComponent(token)}&r=${Date.now()}`),
    onError: (err) => {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Failed to initialize travel booking");
    },
  });
  const mintAndLoad = () => mint.mutate();

  useEffect(() => {
    mint.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; message?: string; code?: string };
      if (msg.type === "loaded") setStatus("ready");
      else if (msg.type === "session_expired") void mintAndLoad();
      else if (msg.type === "error" && status !== "ready") {
        setStatus("error");
        setError(msg.message || "Travel booking is unavailable right now.");
      }
    } catch {
      /* ignore non-JSON messages */
    }
  }

  function onShouldStartLoad(req: WebViewNavigation): boolean {
    if (isInAppHost(req.url)) return true;
    // Partner sites, hotel websites, etc. → system browser
    void WebBrowser.openBrowserAsync(req.url);
    return false;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Travel Benefits",
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Travel Home" hitSlop={8} onPress={() => mintAndLoad()} style={styles.headerButton}>
              <Ionicons name="home-outline" size={20} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.screen}>
        {status === "error" ? (
          <View style={styles.center}>
            <Ionicons name="airplane-outline" size={40} color={colors.stone} />
            <Subheading style={styles.centerText}>Travel Booking Unavailable</Subheading>
            <Body tone="muted" style={styles.centerText}>{error}</Body>
            <Button label="Try Again" variant="primary" size="sm" onPress={() => mintAndLoad()} />
          </View>
        ) : (
          <>
            {uri && (
              <WebView
                ref={webRef}
                source={{ uri }}
                style={styles.web}
                onMessage={onMessage}
                onShouldStartLoadWithRequest={onShouldStartLoad}
                onLoadEnd={() => setTimeout(() => setStatus((s) => (s === "loading" ? "ready" : s)), 6000)}
                onError={(e) => {
                  setStatus("error");
                  setError(e.nativeEvent.description || "Failed to load travel booking");
                }}
                onHttpError={(e) => {
                  if (e.nativeEvent.statusCode >= 400 && e.nativeEvent.url === uri) {
                    setStatus("error");
                    setError(`Travel booking returned an error (${e.nativeEvent.statusCode}).`);
                  }
                }}
                javaScriptEnabled
                domStorageEnabled
                sharedCookiesEnabled
                setSupportMultipleWindows={false}
                allowsBackForwardNavigationGestures
                originWhitelist={["*"]}
                startInLoadingState={false}
              />
            )}
            {status === "loading" && (
              <View style={[styles.center, styles.overlay]}>
                <ActivityIndicator size="large" color={colors.aubergine} />
                <Caption>Loading travel benefits…</Caption>
              </View>
            )}
          </>
        )}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hotels, Cars, Flights & More · powered by Access Development</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  web: { flex: 1, backgroundColor: theme.background },
  headerButton: { padding: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  centerText: { textAlign: "center" },
  overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.background },
  footer: { paddingVertical: 8, alignItems: "center", borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: colors.white },
  footerText: { fontFamily: fonts.ui, fontSize: 11, color: theme.textMuted },
});

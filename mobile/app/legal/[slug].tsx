import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { env } from "@/lib/env";
import { LEGAL_PAGES, type LegalSlug } from "@/types/content";

/**
 * Web equivalent: app/privacy, app/terms-of-service, app/accessibility (+ GET /api/legal/[slug])
 * Build phase: 6
 *
 * The legal copy is a Termly *script* embed (legal_pages.termly_embed_code), which can't be
 * rendered natively, so we load the public web page in a WebView and hide the site chrome
 * (nav, footer, back-to-top, cookie banner) with injected CSS. Pages are public — no auth.
 */

const HIDE_CHROME_CSS = `
  nav, footer, button[aria-label="Back to top"], #termly-code-snippet-support, .termly-styles-root { display: none !important; }
  main { padding-top: 24px !important; padding-bottom: 24px !important; min-height: 0 !important; }
`;

const INJECTED_JS = `
  (function () {
    var s = document.createElement('style');
    s.textContent = ${JSON.stringify(HIDE_CHROME_CSS)};
    document.head.appendChild(s);
  })();
  true;
`;

export default function LegalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const known = (slug ?? "") in LEGAL_PAGES;
  const title = known ? LEGAL_PAGES[slug as LegalSlug] : "Legal";
  const uri = `${env.siteUrl}/${slug}`;

  function onShouldStartLoad(req: WebViewNavigation): boolean {
    if (req.url === uri || req.url.startsWith(`${uri}?`) || req.url.startsWith(`${uri}#`)) return true;
    // Termly and any outbound links → system browser; keep the WebView on the legal page.
    void WebBrowser.openBrowserAsync(req.url);
    return false;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={styles.screen}>
        {!known || failed ? (
          <View style={styles.center}>
            <EmptyState
              icon="document-text-outline"
              title={known ? "Couldn't load this page" : "Page not found"}
              message={known ? "Check your connection and try again, or open it on the website." : undefined}
            />
            {known && (
              <View style={styles.actions}>
                <Button
                  label="Try again"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setFailed(false);
                    setLoading(true);
                    setReloadKey((k) => k + 1);
                  }}
                />
                <Button label="Open on website" variant="ghost" size="sm" onPress={() => WebBrowser.openBrowserAsync(uri)} />
              </View>
            )}
          </View>
        ) : (
          <>
            <WebView
              key={reloadKey}
              source={{ uri }}
              style={styles.web}
              injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
              injectedJavaScript={INJECTED_JS}
              onLoadEnd={() => setLoading(false)}
              onError={() => setFailed(true)}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 400 && e.nativeEvent.url === uri) setFailed(true);
              }}
              onShouldStartLoadWithRequest={onShouldStartLoad}
              setSupportMultipleWindows={false}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
            />
            {loading && (
              <View style={[styles.center, styles.overlay]}>
                <ActivityIndicator size="large" color={colors.aubergine} />
                <Caption>Loading {title}…</Caption>
              </View>
            )}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  web: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: theme.background },
  actions: { flexDirection: "row", gap: 10 },
});

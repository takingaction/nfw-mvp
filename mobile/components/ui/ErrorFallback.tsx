import { Ionicons } from "@expo/vector-icons";
import type { ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Body, Caption, Heading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { reportError } from "@/lib/errorReporter";

/**
 * Crash screen rendered by Expo Router's ErrorBoundary (exported from app/_layout.tsx).
 * Reports once to /api/log/client-error → Slack, then offers a retry (re-mounts the route).
 */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    reportError("root-error-boundary", error);
  }, [error]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.badge}>
        <Ionicons name="alert" size={28} color={colors.white} />
      </View>
      <Heading style={styles.center}>Something went wrong</Heading>
      <Body tone="muted" style={styles.center}>
        Sorry about that — the problem has been reported to our team. Please try again.
      </Body>
      {__DEV__ && (
        <Caption style={[styles.center, styles.devMessage]} numberOfLines={6}>
          {error.message}
        </Caption>
      )}
      <Button label="Try Again" variant="accent" onPress={retry} fullWidth style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  badge: { width: 56, height: 56, backgroundColor: colors.aubergine, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  center: { textAlign: "center" },
  devMessage: { fontFamily: "Menlo", color: colors.statusRed },
});

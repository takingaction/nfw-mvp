import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Heading } from "@/components/ui/Typography";
import { ApiError } from "@/lib/api";
import { createStripeConnectLink } from "@/lib/api/grants";

/**
 * Web equivalent: app/grants/connect/refresh/page.tsx
 * Stripe sends users here when an onboarding link expires. Re-mint the link and reopen Stripe.
 * Deep-link target: nfw://grants/connect/refresh?grantId=… (Slice F).
 * Build phase: 3
 */
export default function ConnectRefreshScreen() {
  const { grantId } = useLocalSearchParams<{ grantId?: string }>();
  const router = useRouter();

  const relaunch = useMutation({
    mutationFn: async () => {
      if (!grantId) throw new Error("Missing grant reference.");
      const { url } = await createStripeConnectLink(grantId);
      await WebBrowser.openBrowserAsync(url);
      return grantId;
    },
    onSuccess: (id) => router.replace({ pathname: "/(tabs)/grants/connect/return", params: { grantId: id } }),
  });

  // Auto-launch once on mount (mirrors the web page's on-mount redirect).
  useEffect(() => {
    relaunch.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (relaunch.isPending) return <LoadingScreen message="Refreshing your connection link..." />;

  const message = relaunch.error
    ? relaunch.error instanceof ApiError
      ? relaunch.error.message
      : relaunch.error.message || "Failed to refresh your connection link"
    : null;

  return (
    <Screen>
      <View style={styles.wrap}>
        <Heading>Connection link expired</Heading>
        {message ? <Body style={{ color: "#991B1B" }}>{message}</Body> : <Body tone="muted">Let&apos;s get you a fresh Stripe onboarding link.</Body>}
        <Button label="Try Again" variant="accent" onPress={() => relaunch.mutate()} fullWidth />
        <Button label="Back to Dashboard" variant="ghost" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 16 },
});

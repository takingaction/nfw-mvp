import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Body, Caption, Label, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { ApiError } from "@/lib/api";
import { createStripeConnectLink } from "@/lib/api/grants";
import { useStripeConnectStatus } from "@/lib/queries/grants";
import { useAuthStore } from "@/stores/auth";

type Props = {
  grantId: string;
  /** Compact = banner usage on the dashboard; default = full card on the grant detail. */
  compact?: boolean;
};

/**
 * Web: components/grants/ConnectBankButton.tsx + StripeAccountStatus.tsx, merged.
 *
 * Flow: POST /api/stripe/connect → open Stripe onboarding in the in-app browser →
 * Stripe redirects to the WEB return page (which sets profiles.stripe_onboarding_completed)
 * → user closes the browser → we re-poll /status and refresh the profile.
 * Slice F universal links will make the return page open the app directly.
 */
export function StripeConnectCard({ grantId, compact }: Props) {
  const status = useStripeConnectStatus(grantId);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const browserOpen = useRef(false);

  // Re-check when the app comes back to the foreground after the Stripe browser session.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && browserOpen.current) {
        browserOpen.current = false;
        void status.refetch();
        void refreshProfile();
      }
    });
    return () => sub.remove();
  }, [status, refreshProfile]);

  async function startOnboarding() {
    setLinking(true);
    setError(null);
    try {
      const { url } = await createStripeConnectLink(grantId);
      browserOpen.current = true;
      await WebBrowser.openBrowserAsync(url);
      // openBrowserAsync resolves when the sheet is dismissed (iOS) — poll immediately too.
      void status.refetch();
      void refreshProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start bank connection");
    } finally {
      setLinking(false);
    }
  }

  const s = status.data;
  const connected = s?.connected === true;
  const started = !!s && s.status !== "not_created";

  if (status.isLoading && !s) {
    return (
      <Card style={styles.card}>
        <Caption>Checking Stripe account status...</Caption>
      </Card>
    );
  }

  if (connected) {
    return (
      <Card style={[styles.card, styles.success]}>
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Label>Bank Account Connected</Label>
        </View>
        {!compact && <Body>Your bank account is connected. Our team will process your payment shortly.</Body>}
      </Card>
    );
  }

  return (
    <Card surface="citrine" bordered={false} style={styles.card}>
      {started ? (
        <>
          <View style={styles.row}>
            <Ionicons name="warning" size={20} color={colors.blackberry} />
            <Subheading>Complete Your Stripe Onboarding</Subheading>
          </View>
          <Body>Please finish setting up your Stripe account to receive your grant funds.</Body>
        </>
      ) : (
        <>
          <Subheading>{compact ? "You're Approved!" : "Your Grant Has Been Approved!"}</Subheading>
          <Body>
            {compact
              ? "Connect your bank account to receive your grant payments."
              : "To receive your funds, please connect your bank account. This is a secure process handled by Stripe — NFW never sees your banking details."}
          </Body>
        </>
      )}
      <Caption tone="default">IMPORTANT: If you don&apos;t have a website, please input nationalfundforwomen.org when prompted.</Caption>
      <Button
        label={linking ? (started ? "Redirecting..." : "Connecting...") : started ? "Continue Onboarding →" : "Connect Bank Account →"}
        variant="tertiary"
        loading={linking}
        onPress={startOnboarding}
      />
      {status.isError && <Caption tone="default">Couldn&apos;t check your Stripe status. You can still start onboarding.</Caption>}
      {error && <Caption style={{ color: colors.statusRed }}>{error}</Caption>}
      <Caption>Stripe opens in a secure browser window. Return to the app when you&apos;re done.</Caption>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  success: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});

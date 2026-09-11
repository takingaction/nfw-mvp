import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { StripeConnectCard } from "@/components/grants/StripeConnectCard";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Heading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { useStripeConnectStatus } from "@/lib/queries/grants";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: app/grants/connect/return/page.tsx
 * Deep-link target: nfw://grants/connect/return?grantId=… (wired via universal links in Slice F).
 * Build phase: 3
 *
 * The web return page is what sets profiles.stripe_onboarding_completed; here we just
 * read /status and show the matching state. Missing grantId ⇒ treated as complete (web parity).
 */
export default function ConnectReturnScreen() {
  const { grantId } = useLocalSearchParams<{ grantId?: string }>();
  const router = useRouter();
  const status = useStripeConnectStatus(grantId);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  if (grantId && status.isLoading) return <LoadingScreen message="Checking your bank connection..." />;

  const complete = !grantId || status.data?.details_submitted === true;

  if (!complete) {
    return (
      <Screen>
        <View style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: colors.citrine }]}>
            <Ionicons name="warning" size={32} color={colors.blackberry} />
          </View>
          <Heading>Setup Incomplete</Heading>
          <Body tone="muted">You didn&apos;t complete the Stripe setup. Please continue your onboarding to receive your grant funds.</Body>
        </View>
        <StripeConnectCard grantId={grantId!} />
        <Button label="Back to Dashboard" variant="ghost" onPress={() => router.replace("/(tabs)/dashboard")} style={styles.back} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: "#DCFCE7" }]}>
          <Ionicons name="checkmark" size={32} color="#16A34A" />
        </View>
        <Heading>Bank account connected!</Heading>
        <Body tone="muted">Your bank account has been successfully connected. Our team will process your payment shortly.</Body>
      </View>
      <Button label="Back to Dashboard →" variant="accent" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 12, paddingVertical: 24 },
  icon: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  back: { marginTop: 16 },
});

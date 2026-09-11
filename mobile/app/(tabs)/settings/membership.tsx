import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { PLANS } from "@/constants/signup";
import { env } from "@/lib/env";
import { formatDateLong } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";

const LEVEL_LABEL: Record<string, string> = { free: "Free Member", contributing: "Contributing Member", founding: "Founding Member", waitlist: "Waitlist" };

/**
 * Web equivalent: components/ManageSubscription.tsx (+ Membership Status card on /profile)
 * Build phase: 6
 *
 * Status-only by design (Apple 3.1.1): upgrades and the Stripe billing portal open the
 * website in the system browser. Gift codes redeem natively.
 */
export default function MembershipScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  if (!profile) return <LoadingScreen />;

  const level = profile.membership_level;
  const paid = level === "contributing" || level === "founding";
  const plan = PLANS.find((p) => p.id === level);

  return (
    <Screen>
      <Heading>Membership</Heading>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Ionicons name={paid ? "ribbon" : "ribbon-outline"} size={22} color={colors.aubergine} />
          <Badge label={LEVEL_LABEL[level] ?? "Free Member"} tone={paid ? "citrine" : "neutral"} />
        </View>
        {profile.subscription_status === "canceling" && profile.subscription_ends_at ? (
          <Caption>Your membership will end on {formatDateLong(profile.subscription_ends_at)}</Caption>
        ) : paid && profile.subscription_ends_at ? (
          <Caption>Renews {formatDateLong(profile.subscription_ends_at)}</Caption>
        ) : null}
        {plan ? <Body tone="muted">{plan.description}</Body> : null}
        {plan?.features.length ? (
          <View style={styles.features}>
            {plan.features.map((f) => (
              <View key={f} style={styles.feature}>
                <Ionicons name="checkmark" size={14} color={colors.wisteria} />
                <Caption tone="default" style={{ flex: 1 }}>{f}</Caption>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        {level === "free" || level === "waitlist" ? (
          <>
            <Label>Upgrade your membership</Label>
            <Caption>Upgrade your membership to unlock exclusive perks and support NFW&apos;s mission.</Caption>
            <Button label="Upgrade Today" variant="primary" onPress={() => Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`)} />
          </>
        ) : level === "contributing" ? (
          <>
            <Label>Become a Founding Member</Label>
            <Caption>Upgrade to Founding for a one-time $85 and cover membership for five other women.</Caption>
            <Button label="Upgrade to Founding - $85" variant="primary" onPress={() => Linking.openURL(`${env.siteUrl}/profile`)} />
          </>
        ) : (
          <>
            <Label>Billing</Label>
            <Caption>Update payment details or cancel through the secure Stripe portal.</Caption>
            <Button label="Manage Subscription" variant="primary" onPress={() => Linking.openURL(`${env.siteUrl}/profile`)} />
          </>
        )}
        <Caption>Opens nationalfundforwomen.org in your browser. Changes appear here after you sign back in or refresh.</Caption>
      </Card>

      {!paid && (
        <Card style={styles.card}>
          <Label>Have a gift code?</Label>
          <Caption>Redeem a gift code to unlock one year of Contributing membership.</Caption>
          <Button label="Redeem Gift Code" variant="accent" onPress={() => router.push("/(tabs)/settings/redeem-gift-code")} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, marginTop: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  features: { gap: 6, marginTop: 4 },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
});

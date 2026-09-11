import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignupProgress } from "@/components/auth/SignupProgress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrandModal } from "@/components/ui/Modal";
import { Body, Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { PLANS, WAITLIST_MODAL_COPY, type Plan } from "@/constants/signup";
import { ApiError } from "@/lib/api";
import { joinWaitlist, redeemGiftCode, updateProfile } from "@/lib/api/profile";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: components/SignUpFlow.tsx step 3 ("Choose your membership")
 * Build phase: 2
 *
 * Paid plans open Stripe Checkout on the website in the system browser (Apple 3.1.1 — no
 * in-app purchase). Gift code and waitlist run natively. Free tier is only reachable via the
 * waitlist link, as on web.
 */
export default function SignUpMembershipScreen() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [giftError, setGiftError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"gift" | "waitlist" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choosePlan(plan: Plan) {
    // Purchase happens on the website. The member returns and signs in with the same account.
    void Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3&plan=${plan.id}`);
  }

  async function applyGift() {
    if (!giftCode.trim()) return setGiftError("Please enter a gift code");
    setBusy("gift");
    setGiftError(null);
    try {
      const res = await redeemGiftCode(giftCode);
      // Web mirrors the server's profile changes client-side too.
      await updateProfile({ profile_completed: true, membership_level: "contributing" });
      await refreshProfile();
      router.replace({ pathname: "/auth/welcome", params: { ends: res.subscriptionEndsAt } });
    } catch (err) {
      setGiftError(err instanceof ApiError ? err.message : "Failed to apply code. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function addToWaitlist() {
    setBusy("waitlist");
    setShowWaitlist(false);
    setError(null);
    try {
      await joinWaitlist();
      await refreshProfile();
      router.replace("/auth/waitlist-confirmed");
    } catch (err) {
      // Web silently swallows this; surface it instead.
      setError(err instanceof ApiError ? err.message : "Failed to join waitlist. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthShell
      hideLogo
      header={
        <>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color={colors.aubergine} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <SignupProgress current={3} />
        </>
      }
      title="Choose your membership"
      subtitle="Every tier supports the mission. Upgrade anytime."
    >
      {/* Gift code */}
      <View style={styles.gift}>
        <Pressable accessibilityRole="button" onPress={() => setShowGift((v) => !v)} style={styles.giftToggle}>
          <Ionicons name="gift-outline" size={18} color={colors.aubergine} />
          <Text style={styles.giftLabel}>I have a gift code</Text>
          <Ionicons name={showGift ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
        </Pressable>
        {showGift && (
          <View style={styles.giftForm}>
            <Input value={giftCode} onChangeText={(v) => setGiftCode(v.toUpperCase())} placeholder="Enter your gift code" autoCapitalize="characters" autoCorrect={false} style={styles.mono} error={giftError} />
            <Button label="Apply" variant="primary" size="sm" onPress={applyGift} loading={busy === "gift"} disabled={!giftCode.trim() || busy !== null} />
          </View>
        )}
      </View>

      {/* Plans */}
      <View style={styles.plans}>
        {PLANS.filter((p) => p.id !== "free").map((plan) => (
          <PlanCard key={plan.id} plan={plan} onPress={() => choosePlan(plan)} disabled={busy !== null} />
        ))}
      </View>
      <Caption style={styles.center}>Payment opens securely on nationalfundforwomen.org. Sign back in here when you&apos;re done.</Caption>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.waitlistLine}>
        If contributing financially isn&apos;t possible, you can{" "}
        <Text style={styles.waitlistLink} onPress={() => setShowWaitlist(true)}>
          join the waitlist for a free membership here
        </Text>
        .
      </Text>

      <BrandModal
        visible={showWaitlist}
        title="Waitlist Membership"
        onRequestClose={() => setShowWaitlist(false)}
        footer={
          <View style={{ flex: 1, gap: 10 }}>
            <Button label="I CAN CONTRIBUTE $15/YEAR" variant="ghost" onPress={() => setShowWaitlist(false)} fullWidth />
            <Button label="ADD ME TO THE WAITLIST" variant="accent" onPress={addToWaitlist} loading={busy === "waitlist"} fullWidth />
          </View>
        }
      >
        <Body>{WAITLIST_MODAL_COPY}</Body>
      </BrandModal>
    </AuthShell>
  );
}

function PlanCard({ plan, onPress, disabled }: { plan: Plan; onPress: () => void; disabled?: boolean }) {
  const dark = plan.highlighted;
  return (
    <View style={[styles.plan, dark && styles.planDark]}>
      {plan.badge ? <Badge label={plan.badge} tone={dark ? "citrine" : "wisteria"} /> : null}
      <Text style={[styles.planName, dark && styles.onDark]}>{plan.name}</Text>
      <Text style={[styles.planDesc, dark && styles.onDarkMuted]}>{plan.description}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.price, dark && { color: colors.citrine }]}>{plan.price}</Text>
        <Text style={[styles.period, dark && styles.onDarkMuted]}>{plan.period}</Text>
      </View>
      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f} style={styles.feature}>
            <View style={styles.featureCheck}>
              <Ionicons name="checkmark" size={12} color={colors.white} />
            </View>
            <Text style={[styles.featureText, dark && styles.onDark]}>{f}</Text>
          </View>
        ))}
      </View>
      <Button label={`Join as ${plan.name}`} variant={dark ? "accent" : "primary"} onPress={onPress} disabled={disabled} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: 12 },
  backText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine },
  gift: { borderWidth: 1, borderColor: theme.border, backgroundColor: colors.white },
  giftToggle: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  giftLabel: { flex: 1, fontFamily: fonts.uiBold, fontSize: 14, color: theme.text },
  giftForm: { padding: 14, paddingTop: 0, gap: 10 },
  mono: { fontFamily: "Menlo", letterSpacing: 1 },
  plans: { gap: 14 },
  plan: { padding: 18, gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border },
  planDark: { backgroundColor: colors.blackberry, borderColor: colors.blackberry },
  planName: { fontFamily: fonts.serifSemiBold, fontSize: 22, color: theme.text },
  planDesc: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: theme.textMuted },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  price: { fontFamily: fonts.uiBlack, fontSize: 34, color: colors.aubergine },
  period: { fontFamily: fonts.ui, fontSize: 14, color: theme.textMuted, marginBottom: 6 },
  features: { gap: 8 },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureCheck: { width: 18, height: 18, marginTop: 2, backgroundColor: colors.wisteria, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: theme.text },
  onDark: { color: colors.white },
  onDarkMuted: { color: "rgba(255,255,255,0.75)" },
  center: { textAlign: "center" },
  errorBox: { backgroundColor: "rgba(248,241,154,0.25)", borderWidth: 1, borderColor: "rgba(46,31,56,0.2)", padding: 12 },
  errorText: { fontFamily: fonts.ui, fontSize: 13, color: theme.text },
  waitlistLine: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, color: theme.textMuted, textAlign: "center" },
  waitlistLink: { fontFamily: fonts.uiBold, color: colors.wisteria, textDecorationLine: "underline" },
});

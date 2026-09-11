import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { redeemGiftCode } from "@/lib/api/profile";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: components/gift/RedeemGiftCodeModal.tsx + POST /api/gift-codes/redeem
 * Build phase: 6
 */
export default function RedeemGiftCodeScreen() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function redeem() {
    setLoading(true);
    setError(null);
    try {
      await redeemGiftCode(code);
      await refreshProfile();
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to redeem code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          <Subheading>Gift code applied!</Subheading>
          <Body tone="muted" style={styles.center}>You now have 1 year of Contributing membership.</Body>
          <Button label="Go to Dashboard" variant="accent" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading>Redeem Gift Code</Heading>
      <Body tone="muted" style={{ marginTop: 6 }}>Enter the gift code you received to unlock your Contributing membership.</Body>
      <View style={styles.form}>
        <Input value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="Enter gift code" autoCapitalize="characters" autoCorrect={false} style={styles.mono} error={error} returnKeyType="go" onSubmitEditing={redeem} />
        <Button label={loading ? "Redeeming..." : "Redeem Code"} variant="accent" onPress={redeem} loading={loading} disabled={loading || !code.trim()} fullWidth />
      </View>
      <Caption style={styles.center}>
        Have a friend who would love NFW?{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(`${env.siteUrl}/gift-membership`)}>
          Gift a membership
        </Text>
      </Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, marginTop: 20, marginBottom: 20 },
  mono: { fontFamily: "Menlo", letterSpacing: 2, textAlign: "center", fontSize: 18 },
  center: { textAlign: "center" },
  link: { fontFamily: fonts.uiBold, color: colors.aubergine, textDecorationLine: "underline" },
  success: { alignItems: "center", gap: 10, paddingTop: 32 },
});

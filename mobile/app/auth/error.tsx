import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { Body, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

/**
 * Web equivalent: app/auth/error/page.tsx
 * Build phase: 2
 *
 * Detects confirmation-link problems (expired / invalid / confirm / token) and offers a resend.
 */
export default function AuthErrorScreen() {
  const { error, email } = useLocalSearchParams<{ error?: string; email?: string }>();
  const raw = error ? decodeURIComponent(error) : "";
  const lower = raw.toLowerCase();
  const isConfirmation = ["expired", "invalid", "confirm", "token"].some((k) => lower.includes(k));

  return (
    <AuthShell title="Confirmation Issue">
      {isConfirmation ? (
        <>
          <View style={styles.notice}>
            <Ionicons name="alert-circle" size={20} color={colors.blackberry} />
            <View style={{ flex: 1, gap: 2 }}>
              <Label>Confirmation link expired or invalid</Label>
              <Body>The confirmation link you clicked has expired or is no longer valid.</Body>
            </View>
          </View>
          <ResendConfirmation initialEmail={email ?? ""} editable />
        </>
      ) : (
        <Body>{raw || "An unspecified error occurred."}</Body>
      )}
      <Text style={styles.center}>
        <Link href="/auth/sign-up" style={styles.link}>
          Back to sign up
        </Link>
        {"   ·   "}
        <Link href="/auth/login" style={styles.link}>
          Sign in
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: "row", gap: 10, backgroundColor: "rgba(248,241,154,0.35)", borderWidth: 1, borderColor: colors.citrine, padding: 14 },
  center: { textAlign: "center", fontFamily: fonts.serif, fontSize: 14 },
  link: { fontFamily: fonts.uiBold, color: colors.aubergine, textDecorationLine: "underline" },
});

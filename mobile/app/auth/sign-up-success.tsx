import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { Body, Caption } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

/**
 * Web equivalent: app/auth/sign-up-success/page.tsx
 * Build phase: 2
 */
export default function SignUpSuccessScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <AuthShell title="Check your email">
      <View style={styles.iconWrap}>
        <Ionicons name="mail-open-outline" size={40} color={colors.aubergine} />
      </View>
      <Body>
        We&apos;ve sent a confirmation email to <Text style={styles.bold}>{email || "your email address"}</Text>.
      </Body>
      <Body tone="muted">Click the link in the email to confirm your account and continue signing up.</Body>
      <Body tone="muted">Once confirmed, come back and sign in — we&apos;ll pick up where you left off.</Body>

      <ResendConfirmation initialEmail={email ?? ""} editable={!email} />

      <Caption style={styles.center}>Didn&apos;t receive the email? Check your spam folder or click resend above.</Caption>
      <Text style={styles.center}>
        <Link href="/auth/login" style={styles.link}>
          Back to sign in
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignSelf: "center", width: 72, height: 72, backgroundColor: "rgba(119,134,190,0.15)", alignItems: "center", justifyContent: "center" },
  bold: { fontFamily: fonts.serifBold },
  center: { textAlign: "center" },
  link: { fontFamily: fonts.uiBold, color: colors.aubergine, textDecorationLine: "underline" },
});

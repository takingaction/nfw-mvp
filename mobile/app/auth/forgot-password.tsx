import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Body } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

/**
 * Web equivalent: components/forgot-password-form.tsx
 * Build phase: 2
 *
 * The Supabase recovery email template links to the website's /auth/confirm → /auth/update-password,
 * so the member resets their password on the web and then signs in here.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${env.siteUrl}/auth/update-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check Your Email" subtitle="Password reset instructions sent">
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={40} color={colors.aubergine} />
        </View>
        <Body tone="muted">If you registered using your email and password, you will receive a password reset email.</Body>
        <Text style={styles.center}>
          <Link href="/auth/login" style={styles.link}>
            Back to login
          </Link>
        </Text>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset Your Password" subtitle="Type in your email and we'll send you a link to reset your password">
      <View style={styles.form}>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="m@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" returnKeyType="send" onSubmitEditing={handleSend} error={error} />
        <Button label={loading ? "Sending..." : "Send reset email"} onPress={handleSend} loading={loading} disabled={!email.trim() || loading} fullWidth />
      </View>
      <Text style={styles.center}>
        Already have an account?{" "}
        <Link href="/auth/login" style={styles.link}>
          Login
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  iconWrap: { alignSelf: "center", width: 72, height: 72, backgroundColor: "rgba(119,134,190,0.15)", alignItems: "center", justifyContent: "center" },
  center: { fontFamily: fonts.serif, fontSize: 14, textAlign: "center", color: "rgba(46,31,56,0.6)" },
  link: { fontFamily: fonts.uiBold, color: colors.aubergine, textDecorationLine: "underline" },
});

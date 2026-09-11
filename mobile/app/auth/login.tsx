import { Image } from "expo-image";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Body, Heading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { signInWithGoogle } from "@/lib/auth/google";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Web equivalent:
 *   - app/auth/login/page.tsx
 *   - components/login-form.tsx
 * Build phase: 2
 *
 * Copy, error strings, resend flow and cooldown mirror the web form exactly.
 * On success the AuthGate redirects to `next` (validated) or the dashboard.
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // "Email not confirmed" resend flow
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/(tabs)/dashboard";

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError(null);
    setShowResend(false);
    try {
      await signInWithPassword(email.trim(), password);
      router.replace(safeNext as never);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.includes("Email not confirmed")) {
        setError("Please confirm your email address first.");
        setShowResend(true);
      } else if (message.includes("Invalid login credentials")) {
        setError("Invalid email or password");
      } else {
        setError(message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim() || resendCooldown > 0) return;
    setIsResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${env.siteUrl}/auth/sign-up?step=1` },
      });
      if (resendError) throw resendError;
      setError(null);
      setShowResend(false);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle(safeNext);
      // AuthGate handles navigation once the session lands.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("@/assets/brand/nfw-symbol-brandmark-aubergine.png")}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="National Fund for Women"
        />

        <View style={styles.header}>
          <Heading accessibilityRole="header">Member Login</Heading>
          <Body tone="muted">Enter your email below to login to your account</Body>
        </View>

        <View style={styles.form}>
          <GoogleButton onPress={handleGoogle} loading={googleLoading} disabled={loading} />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="m@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <Link href="/auth/forgot-password" style={styles.forgot}>
            Forgot your password?
          </Link>

          {error && !showResend && <Text style={styles.error}>{error}</Text>}

          {showResend && (
            <View style={styles.resendBox}>
              <Text style={styles.resendTitle}>Email not confirmed</Text>
              <Text style={styles.resendBody}>{error ?? "Please confirm your email address first."}</Text>
              <Button
                label={
                  isResending
                    ? "Resending..."
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend confirmation email"
                }
                variant="primary"
                size="sm"
                onPress={handleResend}
                loading={isResending}
                disabled={isResending || resendCooldown > 0 || !email.trim()}
                style={styles.resendButton}
              />
            </View>
          )}

          <Button label={loading ? "Logging in..." : "Login"} onPress={handleLogin} loading={loading} fullWidth />
        </View>

        <Text style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" style={styles.footerLink}>
            Sign up
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 24, gap: 24 },
  logo: { width: 180, height: 62, alignSelf: "center" },
  header: { gap: 6 },
  form: { gap: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { fontFamily: fonts.ui, fontSize: 12, color: theme.textMuted, textTransform: "uppercase" },
  forgot: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, alignSelf: "flex-end", marginTop: -6 },
  error: { fontFamily: fonts.ui, fontSize: 13, color: colors.statusRed },
  resendBox: { backgroundColor: "rgba(248,241,154,0.35)", borderWidth: 1, borderColor: colors.citrine, padding: 14, gap: 8 },
  resendTitle: { fontFamily: fonts.uiBold, fontSize: 13, color: theme.text },
  resendBody: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: theme.text },
  resendButton: { alignSelf: "flex-start", marginTop: 4 },
  footer: { fontFamily: fonts.serif, fontSize: 14, color: theme.textMuted, textAlign: "center" },
  footerLink: { fontFamily: fonts.uiBold, color: colors.aubergine },
});

import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Linking, StyleSheet, Text, TextInput, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { isPasswordValid, PASSWORD_REQUIREMENTS } from "@/constants/signup";
import { signInWithGoogle } from "@/lib/auth/google";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

/**
 * Web equivalent: components/SignUpFlow.tsx step 0 ("Create your account")
 * Build phase: 2
 *
 * Password rules, error strings and the post-signup redirect match the web. The
 * confirmation email links to the website's step 1 (emailRedirectTo); after confirming,
 * the member signs in here and the dashboard gate routes them into step 1 on mobile.
 */
export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const repeatRef = useRef<TextInput>(null);

  const valid = isPasswordValid(password);
  const mismatch = repeat.length > 0 && password !== repeat;

  async function handleCreate() {
    setError(null);
    if (password !== repeat) return setError("Passwords do not match");
    if (!valid) return setError("Password must meet all requirements below");
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${env.siteUrl}/auth/sign-up?step=1` },
      });
      if (signUpError) throw signUpError;
      router.replace({ pathname: "/auth/sign-up-success", params: { email: email.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle("/(tabs)/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <Text style={styles.sub}>
          Already a member?{" "}
          <Link href="/auth/login" style={styles.link}>
            Sign in
          </Link>
        </Text>
      }
    >
      <View style={styles.form}>
        <GoogleButton label={googleLoading ? "Redirecting..." : "Sign up with Google"} onPress={handleGoogle} loading={googleLoading} disabled={loading} />
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Input label="Email address" value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="username" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
        <Input ref={passwordRef} label="Password" value={password} onChangeText={setPassword} placeholder="Create a strong password" secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => repeatRef.current?.focus()} />

        {password.length > 0 && (
          <View style={styles.rules}>
            {PASSWORD_REQUIREMENTS.map((r) => {
              const ok = r.test(password);
              return (
                <View key={r.id} style={styles.rule}>
                  <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={16} color={ok ? "#16A34A" : "rgba(46,31,56,0.4)"} />
                  <Text style={[styles.ruleText, ok && styles.ruleOk]}>{r.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Input ref={repeatRef} label="Confirm password" value={repeat} onChangeText={setRepeat} placeholder="Repeat your password" secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={handleCreate} error={mismatch ? "Passwords do not match" : null} />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button label={loading ? "Creating account..." : "Continue"} onPress={handleCreate} loading={loading} disabled={loading || !valid || password !== repeat || !email.trim()} fullWidth />
      </View>

      <Text style={styles.footer}>
        By signing up you agree to our{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(`${env.siteUrl}/terms-of-service`)}>
          Terms
        </Text>{" "}
        and{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(`${env.siteUrl}/privacy`)}>
          Privacy Policy
        </Text>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.serif, fontSize: 15, color: theme.textMuted },
  link: { fontFamily: fonts.uiBold, color: colors.aubergine, textDecorationLine: "underline" },
  form: { gap: 14 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { fontFamily: fonts.ui, fontSize: 12, color: theme.textMuted, textTransform: "uppercase" },
  rules: { gap: 6, paddingHorizontal: 4 },
  rule: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleText: { fontFamily: fonts.ui, fontSize: 13, color: "rgba(46,31,56,0.5)" },
  ruleOk: { color: "#16A34A" },
  errorBox: { backgroundColor: "rgba(248,241,154,0.25)", borderWidth: 1, borderColor: "rgba(46,31,56,0.2)", padding: 12 },
  errorText: { fontFamily: fonts.ui, fontSize: 13, color: theme.text },
  footer: { fontFamily: fonts.serif, fontSize: 13, color: theme.textMuted, textAlign: "center", lineHeight: 19 },
});

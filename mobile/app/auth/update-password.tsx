import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Body } from "@/components/ui/Typography";
import { fonts } from "@/constants/fonts";
import { isPasswordValid, PASSWORD_REQUIREMENTS } from "@/constants/signup";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: components/update-password-form.tsx + POST /api/auth/update-password
 * Build phase: 2
 *
 * Requires an active session (from a recovery deep link handled by app/auth/callback.tsx,
 * or a signed-in member changing their password). Uses supabase.auth.updateUser directly.
 * Improvement over web: applies the same strength rules as sign-up.
 */
export default function UpdatePasswordScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!password) return setError("Password is required");
    if (!isPasswordValid(password)) return setError("Password must meet all requirements below");
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.replace("/(tabs)/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <AuthShell title="Reset Your Password" subtitle="Your reset link has expired or already been used.">
        <Body tone="muted">Request a new password reset email to continue.</Body>
        <Button label="Request new link" onPress={() => router.replace("/auth/forgot-password")} fullWidth />
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Your password has been updated!" subtitle="Redirecting to dashboard...">
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={44} color="#16A34A" />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset Your Password" subtitle="Please enter your new password below.">
      <View style={styles.form}>
        <Input label="New password" value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={handleSave} error={error} />
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
        <Button label={loading ? "Saving..." : "Save new password"} onPress={handleSave} loading={loading} disabled={loading || !password} fullWidth />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  iconWrap: { alignSelf: "center", marginTop: 8 },
  rules: { gap: 6, paddingHorizontal: 4 },
  rule: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleText: { fontFamily: fonts.ui, fontSize: 13, color: "rgba(46,31,56,0.5)" },
  ruleOk: { color: "#16A34A" },
});

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type Props = {
  initialEmail?: string;
  /** Show an email input so the user can supply/correct the address. */
  editable?: boolean;
};

/**
 * "Resend confirmation email" with the web's 60 s cooldown and strings
 * (app/auth/sign-up-success/page.tsx, app/auth/error/page.tsx, components/login-form.tsx).
 */
export function ResendConfirmation({ initialEmail = "", editable = false }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email.trim() || cooldown > 0) return;
    setResending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${env.siteUrl}/auth/sign-up?step=1` },
      });
      if (error) throw error;
      setMessage({ kind: "ok", text: "Confirmation email resent! Check your inbox." });
      setCooldown(60);
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Failed to resend email. Please try again." });
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {editable && (
        <Input
          label="Enter your email to resend the confirmation link"
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      )}
      <Button
        label={resending ? "Resending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation email"}
        variant="ghost"
        onPress={resend}
        loading={resending}
        disabled={resending || cooldown > 0 || !email.trim()}
        fullWidth
      />
      {message ? <Text style={[styles.message, message.kind === "error" && styles.error]}>{message.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  message: { fontFamily: fonts.ui, fontSize: 13, color: "#16A34A", textAlign: "center" },
  error: { color: colors.statusRed },
});

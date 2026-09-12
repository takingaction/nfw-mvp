import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { Body, Caption, Eyebrow, Heading, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { useContactContent, useSubmitContact } from "@/lib/api/content";
import { env } from "@/lib/env";
import { mapWebPathToAppRoute } from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth";
import { CONTACT_SUBJECTS, type ContactHelpCard } from "@/types/content";

/**
 * Web equivalent: app/contact/page.tsx + components/contact/ContactClient.tsx
 *   GET /api/contact (admin-editable copy) · POST /api/contact/submit
 * Build phase: 6
 *
 * Parity: same subject list, labels, placeholders, validation and success copy as the web
 * form. The `free-membership` subject is intentionally absent — that flow is web-only.
 */

/** Marketing pages with no native screen → system browser. */
const WEB_ONLY_PREFIXES = ["/pricing", "/plans", "/perks/info", "/microgrants", "/gift-membership", "/about", "/articles"];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mail: "mail-outline",
  clock: "time-outline",
  heart: "heart-outline",
};

const FALLBACK = {
  hero_eyebrow: "Real people, real responses",
  hero_headline: "Contact Member Support",
  hero_subheadline: "Whether you have a question, need support, or just want to say hi — we're here and we're listening.",
  help_heading: "How can we help?",
  help_intro:
    "Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.",
  help_cards: [] as ContactHelpCard[],
  quick_links: [] as { label: string; url: string }[],
};

export default function ContactScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const content = useContactContent();
  const submit = useSubmitContact();

  const c = content.data ?? FALLBACK;

  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSend = name.trim() && email.trim() && subject && message.trim() && !submit.isPending;

  async function onSubmit() {
    if (!canSend) return;
    setError(null);
    try {
      await submit.mutateAsync({ name: name.trim(), email: email.trim(), subject, message: message.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  /** Quick links are website paths; open in-app when there is an equivalent screen. */
  function openLink(url: string) {
    const isWebOnly = url.startsWith("http") || WEB_ONLY_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`));
    const route = isWebOnly ? url : mapWebPathToAppRoute(url);
    if (!isWebOnly && route !== url) router.push(route as Href);
    else void WebBrowser.openBrowserAsync(url.startsWith("http") ? url : `${env.siteUrl}${url}`);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Screen padded={false}>
        <View style={styles.hero}>
          <Eyebrow tone="accent">{c.hero_eyebrow}</Eyebrow>
          <Heading tone="inverse" style={styles.heroTitle}>{c.hero_headline}</Heading>
          <Body tone="inverseMuted">{c.hero_subheadline}</Body>
        </View>

        <View style={styles.content}>
          {sent ? (
            <Card style={styles.success}>
              <Ionicons name="checkmark-circle" size={48} color={colors.lilac} />
              <Subheading>Success!</Subheading>
              <Body tone="muted" style={styles.center}>We will get back to you within 2-3 business days.</Body>
              <Button label="Back" variant="ghost" size="sm" onPress={() => router.back()} style={{ marginTop: 8 }} />
            </Card>
          ) : (
            <Card>
              <Subheading>Send us a message</Subheading>
              <View style={styles.form}>
                <Input label="Your name" value={name} onChangeText={setName} placeholder="First name" autoCapitalize="words" textContentType="name" />
                <Input
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
                <Select label="What's this about?" value={subject} options={CONTACT_SUBJECTS} onChange={setSubject} placeholder="Select a topic" />
                <Input
                  label="Your message"
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what's on your mind. We're listening."
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={styles.textarea}
                  error={error}
                />
                <Button label={submit.isPending ? "Sending..." : "Send Message"} variant="accent" onPress={onSubmit} loading={submit.isPending} disabled={!canSend} fullWidth />
                <Caption style={styles.center}>
                  Your data is handled as outlined in our{" "}
                  <Text style={styles.link} onPress={() => router.push("/legal/privacy")}>
                    Privacy Policy
                  </Text>
                  .
                </Caption>
              </View>
            </Card>
          )}

          <View style={styles.help}>
            <Subheading>{c.help_heading}</Subheading>
            <Body tone="muted">{c.help_intro}</Body>
            {c.help_cards.map((card, i) => (
              <Card key={`${card.title}-${i}`} surface="dove" bordered={false} style={styles.helpCard}>
                <View style={styles.helpIcon}>
                  <Ionicons name={ICONS[card.icon] ?? "information-circle-outline"} size={18} color={colors.aubergine} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.helpTitle}>{card.title}</Text>
                  <Caption tone="default">{card.content}</Caption>
                  {card.email ? (
                    <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${card.email}`)}>
                      {card.email}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>

          {c.quick_links.length > 0 && (
            <View style={styles.links}>
              <Eyebrow>Quick links</Eyebrow>
              {c.quick_links.map((l) => (
                <Pressable key={l.url} accessibilityRole="link" onPress={() => openLink(l.url)} style={styles.linkRow}>
                  <Text style={styles.linkRowText}>{l.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.aubergine} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.aubergine, paddingHorizontal: 20, paddingVertical: 28, gap: 8 },
  heroTitle: { marginTop: 4 },
  content: { padding: 20, gap: 24 },
  form: { gap: 14, marginTop: 14 },
  textarea: { minHeight: 120, paddingTop: 12 },
  center: { textAlign: "center" },
  link: { fontFamily: fonts.uiBold, color: colors.aubergine, textDecorationLine: "underline" },
  success: { alignItems: "center", gap: 8, paddingVertical: 28 },
  help: { gap: 12 },
  helpCard: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  helpIcon: { width: 32, height: 32, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  helpTitle: { fontFamily: fonts.uiBold, fontSize: 14, color: theme.text },
  links: { gap: 8 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkRowText: { fontFamily: fonts.uiBold, fontSize: 14, color: theme.text },
});

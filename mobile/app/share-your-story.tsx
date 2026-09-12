import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Body, Caption, Eyebrow, Heading, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { ApiError } from "@/lib/api";
import { useSubmitStory } from "@/lib/api/content";
import { useAuthStore } from "@/stores/auth";
import { STORY_PERMISSIONS, STORY_PROMPTS, type TestimonialBody } from "@/types/content";

/**
 * Web equivalent: app/share-your-story/page.tsx + components/dashboard/ShareStoryClient.tsx
 *   POST /api/testimonials · success: app/share-your-story/success/page.tsx
 * Build phase: 6
 *
 * Parity: same sections, prompts, permission copy, prefill (name/email/age-from-DOB unless the
 * 1900-01-01 placeholder, "City, State" from profile) and validation ("Age is required").
 * Web requires a session but no membership/profile gate — same here (AuthGate handles login).
 */

function ageFromDob(dob: string | null | undefined): string {
  if (!dob || dob === "1900-01-01") return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age > 0 ? String(age) : "";
}

type PromptKey = (typeof STORY_PROMPTS)[number]["key"];

export default function ShareYourStoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const submit = useSubmitStory();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [age, setAge] = useState(ageFromDob(profile?.date_of_birth));
  const [location, setLocation] = useState([profile?.city, profile?.state].filter(Boolean).join(", "));
  const [answers, setAnswers] = useState<Record<PromptKey, string>>({
    drawnToMembership: "",
    programsEngaged: "",
    favoritePart: "",
    howNfwHelped: "",
    whyJoin: "",
  });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [preferAnonymous, setPreferAnonymous] = useState(false);
  const [interestedVideo, setInterestedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = !!age.trim() && !submit.isPending;

  async function onSubmit() {
    setError(null);
    if (!age.trim()) {
      setError("Age is required");
      return;
    }
    const [city, ...rest] = location.split(",").map((s) => s.trim());
    const body: TestimonialBody = {
      name: name.trim(),
      email: email.trim(),
      age: age.trim(),
      city: city || undefined,
      state: rest.join(", ") || undefined,
      ...answers,
      permissionGranted,
      preferAnonymous,
      interestedVideo,
    };
    try {
      await submit.mutateAsync(body);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (done) {
    return (
      <Screen>
        <View style={styles.success}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={32} color={colors.blackberry} />
          </View>
          <Heading style={styles.center}>Thank you for sharing!</Heading>
          <Body tone="muted" style={styles.center}>
            Your story has been submitted successfully. We appreciate you taking the time to share your experience with NFW.
          </Body>
          <Button label="Return to Dashboard" variant="accent" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Screen>
        <Heading>Share Your Story</Heading>
        <Body tone="muted" style={{ marginTop: 8 }}>
          Thank you for being a National Fund for Women member and choosing to share your story with us! Your experience helps us shape our
          programs, lift up our community, and spread the word so we can reach and support even more women across the country.
        </Body>

        <Card style={styles.card}>
          <Eyebrow>Member Information</Eyebrow>
          <Input label="Name *" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
          <Input label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
          <Input label="Age *" value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, "").slice(0, 3))} keyboardType="number-pad" maxLength={3} />
          <Input label="Location (City, State) *" value={location} onChangeText={setLocation} placeholder="City, State" autoCapitalize="words" />
        </Card>

        <Card style={styles.card}>
          <Eyebrow>Your Story</Eyebrow>
          <Caption>Optional: Answer any of the following prompts to share your experience.</Caption>
          {STORY_PROMPTS.map((p) => (
            <Input
              key={p.key}
              label={p.label}
              value={answers[p.key]}
              onChangeText={(v) => setAnswers((a) => ({ ...a, [p.key]: v }))}
              placeholder="Share your thoughts..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.textarea}
            />
          ))}
        </Card>

        <Card style={styles.card}>
          <Eyebrow>Permissions</Eyebrow>
          <CheckboxRow label={STORY_PERMISSIONS.permissionGranted} checked={permissionGranted} onPress={() => setPermissionGranted((v) => !v)} />
          <CheckboxRow label={STORY_PERMISSIONS.preferAnonymous} checked={preferAnonymous} onPress={() => setPreferAnonymous((v) => !v)} />
          <CheckboxRow label={STORY_PERMISSIONS.interestedVideo} checked={interestedVideo} onPress={() => setInterestedVideo((v) => !v)} />
        </Card>

        {error ? <Subheading style={styles.error}>{error}</Subheading> : null}
        <Button label={submit.isPending ? "Submitting..." : "Submit Your Story"} variant="accent" onPress={onSubmit} loading={submit.isPending} disabled={!canSubmit} fullWidth style={{ marginTop: 8 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, marginTop: 20 },
  textarea: { minHeight: 100, paddingTop: 12 },
  error: { color: colors.statusRed, fontSize: 14, marginTop: 16 },
  center: { textAlign: "center" },
  success: { alignItems: "center", gap: 12, paddingTop: 40 },
  successBadge: { width: 64, height: 64, backgroundColor: colors.citrine, alignItems: "center", justifyContent: "center" },
});

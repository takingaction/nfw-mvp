import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { Body, Caption, Eyebrow, Heading, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { US_STATES } from "@/constants/signup";
import { ApiError } from "@/lib/api";
import { useSubmitStory } from "@/lib/api/content";
import { useAuthStore } from "@/stores/auth";
import {
  STORY_INTRO,
  STORY_PERMISSIONS,
  STORY_PROGRAMS,
  STORY_PROGRAMS_PROMPT,
  STORY_TEXT_PROMPTS,
  type StoryProgram,
  type StoryTextKey,
  type TestimonialBody,
} from "@/types/content";

/**
 * Web equivalent: app/share-your-story/page.tsx + components/dashboard/ShareStoryClient.tsx
 *   POST /api/testimonials · success: app/share-your-story/success/page.tsx
 * Build phase: 6
 *
 * Parity: same sections, prompts, permission copy, prefill (name/email/age-from-DOB unless the
 * 1900-01-01 placeholder, city/state from profile) and validation (all member info required,
 * at least one story answer; anonymity only selectable with permission).
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

const TEXT_KEYS = Object.keys(STORY_TEXT_PROMPTS) as StoryTextKey[];

export default function ShareYourStoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const submit = useSubmitStory();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [age, setAge] = useState(ageFromDob(profile?.date_of_birth));
  const [city, setCity] = useState(profile?.city ?? "");
  const [state, setState] = useState(
    profile?.state && (US_STATES as readonly string[]).includes(profile.state) ? profile.state : ""
  );
  const [answers, setAnswers] = useState<Record<StoryTextKey, string>>({
    howNfwHelped: "",
    surprisedBy: "",
    improvementIdeas: "",
    feedback: "",
    whyJoin: "",
  });
  const [programsUsed, setProgramsUsed] = useState<StoryProgram[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [preferAnonymous, setPreferAnonymous] = useState(false);
  const [interestedVideo, setInterestedVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const memberInfoComplete = !!(name.trim() && email.trim() && age.trim() && city.trim() && state);
  const hasStoryAnswer = TEXT_KEYS.some((k) => answers[k].trim()) || programsUsed.length > 0;
  const canSubmit = memberInfoComplete && hasStoryAnswer && !submit.isPending;

  const toggleProgram = (p: StoryProgram) =>
    setProgramsUsed((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const togglePermission = () => {
    const next = !permissionGranted;
    setPermissionGranted(next);
    if (!next) setPreferAnonymous(false);
  };

  const renderPrompt = (key: StoryTextKey) => (
    <Input
      key={key}
      label={STORY_TEXT_PROMPTS[key]}
      value={answers[key]}
      onChangeText={(v) => setAnswers((a) => ({ ...a, [key]: v }))}
      placeholder="Share your thoughts..."
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      style={styles.textarea}
    />
  );

  async function onSubmit() {
    setError(null);
    if (!memberInfoComplete) {
      setError("Please complete all Member Information fields.");
      return;
    }
    if (!hasStoryAnswer) {
      setError("Please answer at least one of the story prompts.");
      return;
    }
    const trimmed = Object.fromEntries(TEXT_KEYS.map((k) => [k, answers[k].trim() || undefined]));
    const body: TestimonialBody = {
      name: name.trim(),
      email: email.trim(),
      age: age.trim(),
      city: city.trim(),
      state,
      ...trimmed,
      programsUsed,
      permissionGranted,
      preferAnonymous: permissionGranted && preferAnonymous,
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
          {STORY_INTRO}
        </Body>

        <Card style={styles.card}>
          <Eyebrow>Member Information</Eyebrow>
          <Input label="Name *" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
          <Input label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
          <Input label="Age *" value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, "").slice(0, 3))} keyboardType="number-pad" maxLength={3} />
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Input label="City *" value={city} onChangeText={setCity} autoCapitalize="words" textContentType="addressCity" />
            </View>
            <View style={{ width: 120 }}>
              <Select label="State *" value={state} options={US_STATES} onChange={setState} placeholder="Select" />
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Eyebrow>Your Story</Eyebrow>
          <Caption>Answer any of the following prompts to share your experience. At least one answer is required.</Caption>
          {renderPrompt("howNfwHelped")}
          {renderPrompt("surprisedBy")}
          <View style={{ gap: 8 }}>
            <Text style={styles.groupLabel}>{STORY_PROGRAMS_PROMPT}</Text>
            {STORY_PROGRAMS.map((p) => (
              <CheckboxRow key={p.value} label={p.label} checked={programsUsed.includes(p.value)} onPress={() => toggleProgram(p.value)} />
            ))}
          </View>
          {renderPrompt("improvementIdeas")}
          {renderPrompt("feedback")}
          {renderPrompt("whyJoin")}
        </Card>

        <Card style={styles.card}>
          <Eyebrow>Permissions</Eyebrow>
          <CheckboxRow label={STORY_PERMISSIONS.permissionGranted} checked={permissionGranted} onPress={togglePermission} />
          <CheckboxRow label={STORY_PERMISSIONS.preferAnonymous} checked={preferAnonymous} onPress={() => setPreferAnonymous((v) => !v)} disabled={!permissionGranted} />
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
  twoCol: { flexDirection: "row", gap: 12 },
  // Matches components/ui/Input label style.
  groupLabel: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.4, color: theme.text, textTransform: "uppercase" },
  error: { color: colors.statusRed, fontSize: 14, marginTop: 16 },
  center: { textAlign: "center" },
  success: { alignItems: "center", gap: 12, paddingTop: 40 },
  successBadge: { width: 64, height: 64, backgroundColor: colors.citrine, alignItems: "center", justifyContent: "center" },
});

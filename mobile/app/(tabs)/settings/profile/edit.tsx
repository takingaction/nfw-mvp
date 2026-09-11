import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { EMPTY_IDENTITY, EMPTY_PERSONAL, IdentityFields, PersonalInfoFields, validateIdentity, validatePersonal, type IdentityValues, type PersonalInfoValues } from "@/components/profile/ProfileFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { Heading, Label } from "@/components/ui/Typography";
import { theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { updateProfile } from "@/lib/api/profile";
import { useAuthStore } from "@/stores/auth";
import { PLACEHOLDER_DOB } from "@/types/profile";

/**
 * Web equivalent: components/ProfileCompletionForm.tsx (POST /api/profile/update)
 * Build phase: 2
 */
export default function ProfileEditScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [personal, setPersonal] = useState<PersonalInfoValues>({
    ...EMPTY_PERSONAL,
    full_name: profile?.full_name && profile.full_name !== "Member" ? profile.full_name : "",
    phone_number: profile?.phone_number ?? "",
    address_line1: profile?.address_line1 ?? "",
    address_line2: profile?.address_line2 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    zip: profile?.zip ?? "",
  });
  const [identity, setIdentity] = useState<IdentityValues>({
    ...EMPTY_IDENTITY,
    date_of_birth: profile?.date_of_birth && profile.date_of_birth !== PLACEHOLDER_DOB ? profile.date_of_birth : "",
    household_income: profile?.household_income ?? "",
    identities: profile?.identities ?? [],
    social_handles: { instagram: "", tiktok: "", facebook: "", linkedin: "", ...(profile?.social_handles ?? {}) },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!profile) return <LoadingScreen />;

  async function handleSave() {
    const v = validatePersonal(personal) ?? validateIdentity(identity);
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      await updateProfile({
        ...personal,
        full_name: personal.full_name.trim(),
        date_of_birth: identity.date_of_birth,
        household_income: identity.household_income,
        identities: identity.identities,
        social_handles: identity.social_handles,
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => router.back(), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  const isComplete = profile.full_name && profile.full_name !== "Member";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Screen>
        <Heading style={{ marginBottom: 16 }}>{isComplete ? "Update Your Profile" : "Complete Your Profile"}</Heading>

        <Card style={styles.card}>
          <Label>Personal information</Label>
          <PersonalInfoFields values={personal} onChange={setPersonal} disabled={loading} />
        </Card>

        <Card style={[styles.card, { marginTop: 16 }]}>
          <Label>Context & identity</Label>
          <IdentityFields values={identity} onChange={setIdentity} disabled={loading} />
        </Card>

        {error ? (
          <View style={[styles.msg, styles.errorBox]}>
            <Text style={styles.msgText}>{error}</Text>
          </View>
        ) : success ? (
          <View style={[styles.msg, styles.okBox]}>
            <Text style={styles.msgText}>Profile saved!</Text>
          </View>
        ) : null}

        <Button label={loading ? "Saving..." : isComplete ? "Update Profile" : "Complete Profile"} variant="accent" onPress={handleSave} loading={loading} fullWidth style={{ marginTop: 16 }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: 8 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  msg: { padding: 12, marginTop: 16, borderWidth: 1 },
  errorBox: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  okBox: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" },
  msgText: { fontFamily: fonts.ui, fontSize: 13, color: theme.text },
});

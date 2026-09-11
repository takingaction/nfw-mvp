import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignupProgress } from "@/components/auth/SignupProgress";
import { EMPTY_IDENTITY, IdentityFields, validateIdentity, type IdentityValues } from "@/components/profile/ProfileFields";
import { Button } from "@/components/ui/Button";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { updateProfile } from "@/lib/api/profile";
import { PLACEHOLDER_DOB } from "@/types/profile";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: components/SignUpFlow.tsx step 2 ("Context & identity")
 * Build phase: 2
 *
 * Sets profile_completed = true (same as web). Re-sends the step-1 fields the way web does.
 */
export default function SignUpIdentityScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [values, setValues] = useState<IdentityValues>({
    ...EMPTY_IDENTITY,
    date_of_birth: profile?.date_of_birth && profile.date_of_birth !== PLACEHOLDER_DOB ? profile.date_of_birth : "",
    household_income: profile?.household_income ?? "",
    identities: profile?.identities ?? [],
    social_handles: { instagram: "", tiktok: "", facebook: "", linkedin: "", ...(profile?.social_handles ?? {}) },
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const v = validateIdentity(values);
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      await updateProfile({
        full_name: profile?.full_name ?? undefined,
        phone_number: profile?.phone_number ?? undefined,
        address_line1: profile?.address_line1 ?? undefined,
        address_line2: profile?.address_line2 ?? undefined,
        city: profile?.city ?? undefined,
        state: profile?.state ?? undefined,
        zip: profile?.zip ?? undefined,
        date_of_birth: values.date_of_birth,
        household_income: values.household_income,
        identities: values.identities,
        social_handles: values.social_handles,
        profile_completed: true,
      });
      await refreshProfile();
      router.push("/auth/sign-up/membership");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      hideLogo
      header={
        <>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color={colors.aubergine} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <SignupProgress current={2} />
        </>
      }
      title="Context & identity"
      subtitle="This helps us serve you better. All information is private."
    >
      <IdentityFields values={values} onChange={setValues} disabled={loading} incomeAsRadios />
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Button label={loading ? "Saving..." : "Continue"} onPress={handleContinue} loading={loading} disabled={loading || !values.household_income || !values.date_of_birth} fullWidth />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: 12 },
  backText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine },
  errorBox: { backgroundColor: "rgba(248,241,154,0.25)", borderWidth: 1, borderColor: "rgba(46,31,56,0.2)", padding: 12 },
  errorText: { fontFamily: fonts.ui, fontSize: 13, color: theme.text },
});

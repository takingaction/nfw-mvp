import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignupProgress } from "@/components/auth/SignupProgress";
import { EMPTY_PERSONAL, PersonalInfoFields, validatePersonal, type PersonalInfoValues } from "@/components/profile/ProfileFields";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { updateProfile } from "@/lib/api/profile";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: components/SignUpFlow.tsx step 1 ("Personal information")
 * Build phase: 2
 *
 * Reached after email confirmation + sign-in (dashboard gate → here when !profile_completed),
 * or from the sign-up flow. Pre-fills from the profile so returning members don't retype.
 */
export default function SignUpProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [values, setValues] = useState<PersonalInfoValues>({
    ...EMPTY_PERSONAL,
    full_name: profile?.full_name && profile.full_name !== "Member" ? profile.full_name : "",
    phone_number: profile?.phone_number ?? "",
    address_line1: profile?.address_line1 ?? "",
    address_line2: profile?.address_line2 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    zip: profile?.zip ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const v = validatePersonal(values);
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      await updateProfile({ ...values, full_name: values.full_name.trim() });
      await refreshProfile();
      router.push("/auth/sign-up/identity");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell hideLogo header={<SignupProgress current={1} />} title="Personal information" subtitle="Help us get to know you a little better.">
      <PersonalInfoFields values={values} onChange={setValues} disabled={loading} />
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Button label={loading ? "Saving..." : "Continue"} onPress={handleContinue} loading={loading} fullWidth />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  errorBox: { backgroundColor: "rgba(248,241,154,0.25)", borderWidth: 1, borderColor: "rgba(46,31,56,0.2)", padding: 12 },
  errorText: { fontFamily: fonts.ui, fontSize: 13, color: theme.text },
});

import { StyleSheet, Text, View } from "react-native";

import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { DateField } from "@/components/ui/DateField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Caption, Label } from "@/components/ui/Typography";
import { theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { IDENTITY_OPTIONS, INCOME_RANGES, MIN_DOB_ISO, US_STATES, maxDobIso } from "@/constants/signup";
import type { SocialHandles } from "@/types/profile";

export interface PersonalInfoValues {
  full_name: string;
  phone_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
}

export interface IdentityValues {
  date_of_birth: string;
  household_income: string;
  identities: string[];
  social_handles: Required<SocialHandles>;
}

export const EMPTY_PERSONAL: PersonalInfoValues = { full_name: "", phone_number: "", address_line1: "", address_line2: "", city: "", state: "", zip: "" };
export const EMPTY_IDENTITY: IdentityValues = { date_of_birth: "", household_income: "", identities: [], social_handles: { instagram: "", tiktok: "", facebook: "", linkedin: "" } };

/** Web SignUpFlow step 1 fields / ProfileCompletionForm top half. Labels + placeholders verbatim. */
export function PersonalInfoFields({ values, onChange, disabled }: { values: PersonalInfoValues; onChange: (v: PersonalInfoValues) => void; disabled?: boolean }) {
  const set = (k: keyof PersonalInfoValues) => (v: string) => onChange({ ...values, [k]: v });
  return (
    <View style={styles.group}>
      <Input label="Full name *" value={values.full_name} onChangeText={set("full_name")} placeholder="Your full name" autoComplete="name" textContentType="name" editable={!disabled} />
      <Input label="Phone number *" value={values.phone_number} onChangeText={set("phone_number")} placeholder="(555) 123-4567" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" editable={!disabled} />
      <Input label="Address line 1 *" value={values.address_line1} onChangeText={set("address_line1")} placeholder="Street address" autoComplete="street-address" textContentType="streetAddressLine1" editable={!disabled} />
      <Input label="Address line 2 (Optional)" value={values.address_line2} onChangeText={set("address_line2")} placeholder="Apt, suite, unit, etc." textContentType="streetAddressLine2" editable={!disabled} />
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <Input label="City *" value={values.city} onChangeText={set("city")} textContentType="addressCity" editable={!disabled} />
        </View>
        <View style={{ width: 120 }}>
          <Select label="State *" value={values.state} options={US_STATES} onChange={set("state")} placeholder="Select" disabled={disabled} />
        </View>
      </View>
      <Input label="ZIP code *" value={values.zip} onChangeText={(v) => set("zip")(v.replace(/\D/g, "").slice(0, 5))} placeholder="12345" keyboardType="number-pad" maxLength={5} autoComplete="postal-code" textContentType="postalCode" editable={!disabled} />
    </View>
  );
}

/** Web SignUpFlow step 2 fields / ProfileCompletionForm bottom half. Option lists verbatim. */
export function IdentityFields({ values, onChange, disabled, incomeAsRadios }: { values: IdentityValues; onChange: (v: IdentityValues) => void; disabled?: boolean; incomeAsRadios?: boolean }) {
  function toggleIdentity(opt: string) {
    const has = values.identities.includes(opt);
    onChange({ ...values, identities: has ? values.identities.filter((x) => x !== opt) : [...values.identities, opt] });
  }
  const setHandle = (k: keyof SocialHandles) => (v: string) => onChange({ ...values, social_handles: { ...values.social_handles, [k]: v } });

  return (
    <View style={styles.group}>
      <DateField label="Date of birth *" nativeID="date_of_birth" value={values.date_of_birth} onChange={(iso) => onChange({ ...values, date_of_birth: iso })} minIso={MIN_DOB_ISO} maxIso={maxDobIso()} hint="You must be 18 or older to join" disabled={disabled} />

      <View style={styles.block}>
        <Label>Which best describes your current annual household income? *</Label>
        {incomeAsRadios ? (
          <View style={styles.options}>
            {INCOME_RANGES.map((r) => (
              <CheckboxRow key={r} radio label={r} checked={values.household_income === r} onPress={() => onChange({ ...values, household_income: r })} disabled={disabled} />
            ))}
          </View>
        ) : (
          <Select value={values.household_income} options={INCOME_RANGES} onChange={(v) => onChange({ ...values, household_income: v })} placeholder="Select income range" disabled={disabled} />
        )}
      </View>

      <View style={styles.block}>
        <Label>
          Tell us a little about your life * <Text style={styles.muted}>(Select all that apply)</Text>
        </Label>
        <View style={styles.options}>
          {IDENTITY_OPTIONS.map((opt) => (
            <CheckboxRow key={opt} label={opt} checked={values.identities.includes(opt)} onPress={() => toggleIdentity(opt)} disabled={disabled} />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Label>Social media handles (Optional)</Label>
        <Caption>Only if you&apos;d like to share.</Caption>
        <Input value={values.social_handles.instagram} onChangeText={setHandle("instagram")} placeholder="Instagram (@username)" autoCapitalize="none" editable={!disabled} />
        <Input value={values.social_handles.tiktok} onChangeText={setHandle("tiktok")} placeholder="TikTok (@username)" autoCapitalize="none" editable={!disabled} />
        <Input value={values.social_handles.facebook} onChangeText={setHandle("facebook")} placeholder="Facebook (profile URL)" autoCapitalize="none" keyboardType="url" editable={!disabled} />
        <Input value={values.social_handles.linkedin} onChangeText={setHandle("linkedin")} placeholder="LinkedIn (profile URL)" autoCapitalize="none" keyboardType="url" editable={!disabled} />
      </View>
    </View>
  );
}

export function validatePersonal(v: PersonalInfoValues): string | null {
  if (!v.full_name.trim()) return "Please enter your full name";
  if (!v.phone_number.trim()) return "Please enter your phone number";
  if (!v.address_line1.trim()) return "Please enter your address";
  if (!v.city.trim()) return "Please enter your city";
  if (!v.state) return "Please select your state";
  if (!/^\d{5}$/.test(v.zip)) return "Please enter a 5-digit ZIP code";
  return null;
}

export function validateIdentity(v: IdentityValues): string | null {
  if (!v.date_of_birth) return "Please enter your date of birth";
  if (v.date_of_birth < MIN_DOB_ISO || v.date_of_birth > maxDobIso()) return "You must be 18 or older to join";
  if (!v.household_income) return "Please select your household income";
  if (v.identities.length === 0) return "Please select at least one option";
  return null;
}

const styles = StyleSheet.create({
  group: { gap: 16 },
  twoCol: { flexDirection: "row", gap: 12 },
  block: { gap: 8 },
  options: { gap: 8 },
  muted: { fontFamily: fonts.ui, color: theme.textMuted, textTransform: "none", letterSpacing: 0 },
});

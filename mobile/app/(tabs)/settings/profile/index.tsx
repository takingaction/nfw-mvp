import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Banner } from "@/components/ui/Banner";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { formatDateLong, formatDateShort } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { needsDateOfBirth } from "@/types/profile";

const LEVEL_LABEL: Record<string, string> = {
  free: "Free Member",
  contributing: "Contributing Member",
  founding: "Founding Member",
  waitlist: "Waitlist",
};

/**
 * Web equivalent: app/profile/page.tsx + app/profile/ProfileClient.tsx
 * Build phase: 2
 *
 * Sections (web order): DOB banner · header · avatar · Membership Status · Profile Information ·
 * Danger Zone. Editing lives on settings/profile/edit (web renders the form inline).
 */
export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [refreshing, setRefreshing] = useState(false);

  if (!profile) return <LoadingScreen />;

  const level = profile.membership_level;
  const location = profile.city && profile.state ? `${profile.city}, ${profile.state} ${profile.zip ?? ""}`.trim() : null;

  return (
    <Screen
      padded={false}
      onRefresh={async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
      }}
      refreshing={refreshing}
    >
      {needsDateOfBirth(profile) && (
        <Banner surface="wisteria" message="Please add your date of birth to complete your profile. This is required for grant applications." actionLabel="Add Date of Birth" onAction={() => router.push("/(tabs)/settings/profile/edit")} />
      )}

      <View style={styles.body}>
        <View>
          <Heading>Your Profile</Heading>
          <Body tone="muted">Manage your NFW membership and profile information.</Body>
        </View>

        <Card style={styles.card}>
          <Label>Profile Photo</Label>
          <AvatarPicker />
        </Card>

        <Card style={styles.card}>
          <Label>Membership Status</Label>
          <View style={styles.row}>
            <Badge label={LEVEL_LABEL[level] ?? "Free Member"} tone={level === "contributing" || level === "founding" ? "citrine" : "neutral"} />
            {profile.subscription_status === "canceling" && profile.subscription_ends_at ? <Caption>Your membership will end on {formatDateLong(profile.subscription_ends_at)}</Caption> : null}
          </View>
          {level === "free" || level === "waitlist" ? <Caption>Upgrade your membership to unlock exclusive perks and support NFW&apos;s mission.</Caption> : null}
          <Button label="Manage membership" variant="ghost" size="sm" onPress={() => router.push("/(tabs)/settings/membership")} style={styles.inlineButton} />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Label>Profile Information</Label>
            <Button label="Edit" variant="ghost" size="sm" onPress={() => router.push("/(tabs)/settings/profile/edit")} />
          </View>
          <InfoRow label="Full Name" value={profile.full_name && profile.full_name !== "Member" ? profile.full_name : "Not set"} />
          <InfoRow label="Email" value={profile.email ?? user?.email ?? "—"} />
          <InfoRow label="Phone" value={profile.phone_number || "Not set"} />
          <InfoRow label="Location" value={location || "Not set"} />
          <InfoRow label="Date of Birth" value={!needsDateOfBirth(profile) && profile.date_of_birth ? formatDateShort(profile.date_of_birth) : "Not set"} />
          <InfoRow label="Member Since" value={formatDateShort(profile.joined_at ?? new Date().toISOString())} />
          {profile.household_income ? <InfoRow label="Household Income" value={profile.household_income} /> : null}
        </Card>

        <Card style={[styles.card, styles.danger]}>
          <View style={styles.row}>
            <Ionicons name="warning-outline" size={18} color={colors.statusRed} />
            <Subheading style={{ color: colors.statusRed }}>Danger Zone</Subheading>
          </View>
          <Caption>Once you delete your account, there is no going back. All your personal data will be permanently removed.</Caption>
          <Button label="Delete Account" variant="danger" size="sm" onPress={() => router.push("/(tabs)/settings/delete-account")} style={styles.inlineButton} />
        </Card>
      </View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  card: { gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  inlineButton: { alignSelf: "flex-start" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  infoLabel: { fontFamily: fonts.uiBold, fontSize: 12, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { flex: 1, fontFamily: fonts.serif, fontSize: 15, color: theme.text, textAlign: "right" },
  danger: { borderColor: "#FCA5A5" },
});

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";
import { formatMonthYear, initials } from "@/lib/format";
import type { MembershipLevel } from "@/types/profile";

type Props = {
  memberName: string;
  membershipLevel: MembershipLevel;
  joinedAt: string | null;
  avatarUrl: string | null;
  badgeFoundingUrl?: string | null;
};

const LEVEL_LABEL: Record<MembershipLevel, string> = {
  free: "Free Member",
  contributing: "Contributing Member",
  founding: "Founding Member",
  waitlist: "Waitlist",
};

/**
 * Web: components/dashboard/MembershipCard.tsx
 * Avatar (fallback initials), founding badge overlay, name, "Member since Mon YYYY",
 * level pill, "Become a Founding Member" (hidden for founding), "Manage membership".
 *
 * Mobile difference: upgrade opens the website in the system browser (Apple 3.1.1 —
 * no in-app purchase flow). Web uses Stripe checkout / /api/membership/upgrade.
 */
export function MembershipCard({ memberName, membershipLevel, joinedAt, avatarUrl, badgeFoundingUrl }: Props) {
  const router = useRouter();
  const since = formatMonthYear(joinedAt);

  function upgrade() {
    void Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`);
  }

  return (
    <Card surface="dove" bordered={false} style={styles.card}>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            {initials(memberName) ? (
              <Text style={styles.initials}>{initials(memberName)}</Text>
            ) : (
              <Ionicons name="person" size={48} color={colors.white} />
            )}
          </View>
        )}
        {membershipLevel === "founding" && badgeFoundingUrl && (
          <Image source={{ uri: badgeFoundingUrl }} style={styles.badge} contentFit="contain" />
        )}
      </View>

      <Subheading style={styles.name}>{memberName}</Subheading>
      {since ? <Caption>Member since {since}</Caption> : null}
      <Badge label={LEVEL_LABEL[membershipLevel]} tone="aubergine" style={styles.level} />

      {membershipLevel !== "founding" && (
        <Button label="Become a Founding Member" variant="secondary" size="sm" onPress={upgrade} style={styles.upgrade} />
      )}
      <Button label="Manage membership" variant="ghost" size="sm" onPress={() => router.push("/(tabs)/settings/membership")} />
    </Card>
  );
}

const AVATAR = 112;

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 8, paddingVertical: 24 },
  avatarWrap: { width: AVATAR, height: AVATAR, marginBottom: 6 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarFallback: { backgroundColor: colors.lilac, alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: fonts.uiBlack, fontSize: 36, color: colors.white, letterSpacing: 1 },
  badge: { position: "absolute", right: -10, bottom: -6, width: 56, height: 56, transform: [{ rotate: "20deg" }] },
  name: { textAlign: "center", marginTop: 4 },
  level: { marginTop: 4 },
  upgrade: { marginTop: 10, alignSelf: "stretch" },
});

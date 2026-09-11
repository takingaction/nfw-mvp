import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Body, Caption, Label, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent:
 *   - components/AuthButtonCombined.tsx (member dropdown)
 *   - app/auth/logout/route.ts
 * Build phase: 6
 */
export default function SettingsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [signingOut, setSigningOut] = useState(false);

  const level = profile?.membership_level ?? "free";
  const levelLabel = level === "waitlist" ? "Waitlist" : `${level} member`;

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  }

  return (
    <Screen>
      <Card style={styles.identity}>
        <Subheading>{profile?.full_name || "Member"}</Subheading>
        <Caption>{profile?.email ?? user?.email ?? ""}</Caption>
        <Badge label={levelLabel} tone={level === "founding" || level === "contributing" ? "citrine" : "neutral"} />
      </Card>

      <Group title="Account">
        <Row icon="person-outline" label="My Profile" onPress={() => router.push("/(tabs)/settings/profile")} />
        <Row icon="card-outline" label="Membership" onPress={() => router.push("/(tabs)/settings/membership")} />
        <Row icon="gift-outline" label="Redeem Gift Code" onPress={() => router.push("/(tabs)/settings/redeem-gift-code")} />
        <Row icon="notifications-outline" label="Notifications" onPress={() => router.push("/(tabs)/settings/notifications")} />
      </Group>

      <Group title="Support">
        <Row icon="chatbubble-ellipses-outline" label="Contact Member Support" onPress={() => router.push("/contact")} />
        <Row icon="help-circle-outline" label="FAQ" onPress={() => router.push("/faq")} />
        <Row icon="megaphone-outline" label="Share Your Story" onPress={() => router.push("/share-your-story")} />
      </Group>

      <Group title="Legal">
        <Row icon="document-text-outline" label="Privacy Policy" onPress={() => router.push("/legal/privacy" as Href)} />
        <Row icon="document-text-outline" label="Terms of Service" onPress={() => router.push("/legal/terms-of-service" as Href)} />
        <Row icon="accessibility-outline" label="Accessibility" onPress={() => router.push("/legal/accessibility" as Href)} />
        <Row icon="open-outline" label="nationalfundforwomen.org" onPress={() => Linking.openURL(env.siteUrl)} external />
      </Group>

      <Group title="">
        <Row icon="log-out-outline" label={signingOut ? "Signing out..." : "Sign Out"} onPress={confirmSignOut} destructive />
        <Row
          icon="trash-outline"
          label="Delete Account"
          onPress={() => router.push("/(tabs)/settings/delete-account")}
          destructive
        />
      </Group>

      <Caption style={styles.version}>
        Version {Constants.expoConfig?.version ?? "1.0.0"}
        {__DEV__ ? " · dev" : ""}
      </Caption>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      {title ? <Label tone="muted" style={styles.groupTitle}>{title.toUpperCase()}</Label> : null}
      <Card padded={false}>{children}</Card>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  destructive,
  external,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  external?: boolean;
}) {
  const color = destructive ? colors.statusRed : theme.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Ionicons name={icon} size={20} color={destructive ? colors.statusRed : colors.aubergine} />
      <Body style={[styles.rowLabel, { color }]}>{label}</Body>
      <Ionicons name={external ? "open-outline" : "chevron-forward"} size={18} color={colors.stone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { gap: 6, marginBottom: 20 },
  group: { marginBottom: 20, gap: 8 },
  groupTitle: { fontSize: 11 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowPressed: { backgroundColor: colors.dove },
  rowLabel: { flex: 1, fontSize: 15 },
  version: { textAlign: "center", marginTop: 8 },
});

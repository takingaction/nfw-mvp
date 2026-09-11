import { Link, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Body, Eyebrow } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: app/auth/welcome/page.tsx
 * Build phase: 2
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const level = useAuthStore((s) => s.profile?.membership_level);
  const paid = level === "contributing" || level === "founding";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      <Eyebrow tone="accent">{paid ? "Membership Activated" : "Welcome to the community"}</Eyebrow>
      <Text style={styles.title}>{level === "founding" ? "You're a Founding Member!" : level === "contributing" ? "You're a Contributing Member!" : "You're officially a member!"}</Text>
      <Body tone="inverse" style={styles.body}>
        Welcome to NFW—and thank you for showing up for women. Your membership helps make this work possible, and gives you access to microgrants, perks, the Zero Dollar Store, a community that has your back, and more.
      </Body>

      <View style={styles.actions}>
        <Button label="Go to my NFW member dashboard" variant="accent" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth />
        <Button label="Apply for a grant" variant="secondary" onPress={() => router.replace("/(tabs)/grants")} fullWidth />
        <Button label="Explore Perks" variant="secondary" onPress={() => router.replace("/(tabs)/perks")} fullWidth />
        <Button label="Browse the Zero Dollar Store" variant="secondary" onPress={() => router.replace("/store")} fullWidth />
      </View>

      <Text style={styles.footer}>
        Questions?{" "}
        <Link href="/contact" style={styles.footerLink}>
          Contact us
        </Link>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.aubergine },
  content: { paddingHorizontal: 24, gap: 16 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: colors.white },
  body: { fontSize: 16 },
  actions: { gap: 10, marginTop: 8 },
  footer: { fontFamily: fonts.serif, fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 8 },
  footerLink: { fontFamily: fonts.uiBold, color: colors.citrine, textDecorationLine: "underline" },
});

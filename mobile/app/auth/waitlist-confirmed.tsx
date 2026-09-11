import { Link, useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Body } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";

/**
 * Web equivalent: app/auth/waitlist-confirmed/page.tsx
 * Build phase: 2
 */
export default function WaitlistConfirmedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      <Badge label="Waitlist Confirmation" tone="citrine" />
      <Text style={styles.title}>Thanks for joining the waitlist!</Text>
      <Body tone="inverse" style={styles.body}>
        If you&apos;d like to join today as a Contributing Member for $1.25/month (billed annually at $15), click the button below and immediately get access to monthly microgrants, discounts you can use everyday, and the Zero Dollar Store.
      </Body>
      <View style={styles.actions}>
        <Button label="BECOME A CONTRIBUTING MEMBER" variant="accent" onPress={() => Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`)} fullWidth />
        <Button label="Go to Dashboard" variant="secondary" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth />
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
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: colors.white },
  body: { fontSize: 16 },
  actions: { gap: 10, marginTop: 8 },
  footer: { fontFamily: fonts.serif, fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 8 },
  footerLink: { fontFamily: fonts.uiBold, color: colors.citrine, textDecorationLine: "underline" },
});

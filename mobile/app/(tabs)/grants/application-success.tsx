import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Body, Eyebrow } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

const STEPS = [
  { n: "01", text: "Our team reviews your application" },
  { n: "02", text: "You'll receive a decision on the last day of the month" },
  { n: "03", text: "If approved, you'll receive funds via a digital transfer" },
];

/**
 * Web equivalent: app/grants/application-success/page.tsx (copy verbatim; `?id` ignored there too).
 * Build phase: 3
 */
export default function ApplicationSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.check}>
        <Ionicons name="checkmark" size={36} color={colors.white} />
      </View>
      <Eyebrow tone="accent">Application received</Eyebrow>
      <Text style={styles.title}>Application Submitted!</Text>
      <Body tone="inverse" style={styles.body}>
        Your microgrant application has been received. Our team will review it and notify you of the decision on the last day of the month.
      </Body>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>What happens next</Text>
        {STEPS.map((s) => (
          <View key={s.n} style={styles.step}>
            <Text style={styles.stepNumber}>{s.n}</Text>
            <Text style={styles.stepText}>{s.text}</Text>
          </View>
        ))}
      </View>

      <Button label="View My Applications" variant="accent" onPress={() => router.replace("/(tabs)/grants/my-applications")} fullWidth />
      <Button label="Go to Dashboard" variant="secondary" onPress={() => router.replace("/(tabs)/dashboard")} fullWidth />

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
  content: { padding: 24, paddingTop: 40, gap: 14 },
  check: { width: 64, height: 64, backgroundColor: colors.lilac, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: colors.white },
  body: { fontSize: 16 },
  card: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", padding: 18, gap: 12, marginVertical: 8 },
  cardHeading: { fontFamily: fonts.uiBlack, fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase", color: colors.citrine },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNumber: { fontFamily: fonts.uiBlack, fontSize: 13, color: colors.lilac, width: 28 },
  stepText: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.white },
  footer: { fontFamily: fonts.serif, fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 8 },
  footerLink: { fontFamily: fonts.uiBold, color: colors.citrine, textDecorationLine: "underline" },
});

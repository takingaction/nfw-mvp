import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Props = { heroImage: string | null };

/**
 * Web: components/dashboard/DashboardHero.tsx
 * Eyebrow "Your Member Dashboard" · H1 "Here to help." (help. italic) ·
 * "Real support today." / "Real power over time." · two wisteria buttons.
 */
export function DashboardHero({ heroImage }: Props) {
  const router = useRouter();
  const source = heroImage ? { uri: heroImage } : require("@/assets/brand/landing.jpg");

  return (
    <View style={styles.hero}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient
        colors={["rgba(46,31,56,0.85)", "rgba(46,31,56,0.35)"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Eyebrow tone="accent">Your Member Dashboard</Eyebrow>
        <Text style={styles.headline} accessibilityRole="header">
          Here to <Text style={styles.headlineItalic}>help.</Text>
        </Text>
        <Text style={styles.sub}>Real support today.</Text>
        <Text style={styles.sub}>Real power over time.</Text>
        <View style={styles.actions}>
          <Button label="Apply for a Microgrant" variant="secondary" size="sm" onPress={() => router.push("/(tabs)/grants/apply")} />
          <Button label="Explore Perks" variant="secondary" size="sm" onPress={() => router.push("/(tabs)/perks")} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 340, justifyContent: "flex-end", backgroundColor: colors.blackberry },
  content: { padding: 24, gap: 8 },
  headline: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, color: colors.white, marginTop: 4 },
  headlineItalic: { fontFamily: fonts.serifItalic },
  sub: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, color: "rgba(255,255,255,0.9)" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
});

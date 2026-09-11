import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Section } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";
import type { DashboardSettings } from "@/types/dashboard";

type Props = { settings: DashboardSettings | null };

/**
 * Web: components/dashboard/BottomActions.tsx — aubergine band with 3 image tiles:
 * Contact Us · Gift a Membership · Share Your Story.
 * Gift a Membership is a purchase flow → opens the website (Apple 3.1.1).
 */
export function BottomActions({ settings }: Props) {
  const router = useRouter();

  const tiles = [
    { label: "Contact Us", image: settings?.square_image1_url, onPress: () => router.push("/contact") },
    { label: "Gift a Membership", image: settings?.square_image2_url, onPress: () => Linking.openURL(`${env.siteUrl}/gift-membership`) },
    { label: "Share Your Story", image: settings?.square_image3_url, onPress: () => router.push("/share-your-story") },
  ];

  return (
    <Section surface="aubergine">
      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable key={t.label} accessibilityRole="button" onPress={t.onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            {t.image ? <Image source={{ uri: t.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.overlay} />
            <Text style={styles.label}>{t.label.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  tile: { aspectRatio: 4 / 3, backgroundColor: colors.wisteria, justifyContent: "flex-end", overflow: "hidden" },
  pressed: { opacity: 0.9 },
  overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(46,31,56,0.35)" },
  label: { fontFamily: fonts.uiBlack, fontSize: 14, letterSpacing: 0.8, color: colors.white, padding: 16 },
});

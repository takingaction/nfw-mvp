import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { Heading, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Props = { savedBrands: number; redeemed: number };

/**
 * Web: components/dashboard/YourPerksAndBenefits.tsx (aubergine band) — condensed.
 * "Your Perks & Benefits" + "Explore Perks" · Saved Brands / Redeemed Perks tiles.
 */
export function PerksSummary({ savedBrands, redeemed }: Props) {
  const router = useRouter();
  return (
    <Section surface="aubergine">
      <View style={styles.header}>
        <Heading tone="inverse">Your Perks & Benefits</Heading>
        <Button label="Explore Perks" variant="tertiary" size="sm" onPress={() => router.push("/(tabs)/perks")} />
      </View>
      <View style={styles.tiles}>
        <Tile icon="heart" count={savedBrands} label="Saved Brands" cta="Explore Your Saved Brands" href="/(tabs)/perks/saved" />
        <Tile icon="pricetag" count={redeemed} label="Redeemed Perks" cta="Explore Your Redeemed Perks" href="/(tabs)/perks/history" />
      </View>
    </Section>
  );
}

function Tile({ icon, count, label, cta, href }: { icon: keyof typeof Ionicons.glyphMap; count: number; label: string; cta: string; href: Href }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={colors.citrine} />
      <Text style={styles.count}>{count}</Text>
      <Label tone="inverse">{label}</Label>
      <Text style={styles.cta}>{cta} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  tiles: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", padding: 16, gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  pressed: { opacity: 0.85 },
  count: { fontFamily: fonts.serifSemiBold, fontSize: 30, color: colors.white },
  cta: { fontFamily: fonts.uiBold, fontSize: 11, color: colors.lilac, marginTop: 8 },
});

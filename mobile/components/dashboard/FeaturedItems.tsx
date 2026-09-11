import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Section } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";
import { decodeHtml } from "@/lib/format";
import type { FeaturedItem } from "@/types/dashboard";

type Props = { items: FeaturedItem[] };

/**
 * Web: components/dashboard/PopularAcrossNFW.tsx — "Popular across NFW" grid of up to 5
 * portrait cards with a citrine title bar. Horizontal strip on mobile.
 *
 * Routing per type:
 *   microgrant      → Grants tab
 *   shopify_product → Zero Dollar Store
 *   perk            → item.link (in-app path) or /perks
 *   article         → website (articles are Phase 2 on mobile)
 */
export function FeaturedItems({ items }: Props) {
  const router = useRouter();
  if (!items.length) return null;

  function open(item: FeaturedItem) {
    switch (item.type) {
      case "microgrant":
        router.push("/(tabs)/grants");
        return;
      case "shopify_product":
        router.push("/store");
        return;
      case "perk": {
        const link = item.link?.trim();
        if (link && link.startsWith("/")) router.push(link as Href);
        else if (link && /^https?:/.test(link)) void Linking.openURL(link);
        else router.push("/(tabs)/perks");
        return;
      }
      case "article":
        void Linking.openURL(`${env.siteUrl}/articles/${item.slug ?? ""}`);
        return;
    }
  }

  return (
    <Section surface="dove" style={styles.section}>
      <Heading>Popular across NFW</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {items.slice(0, 5).map((item) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => open(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}
            <View style={[styles.titleBar, item.type === "perk" && styles.titleBarPerk]}>
              <Text numberOfLines={2} style={[styles.title, item.type === "perk" && styles.titlePerk]}>
                {decodeHtml(item.button_label || item.title)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 20 },
  strip: { gap: 12, paddingRight: 20 },
  card: { width: 160 },
  pressed: { opacity: 0.85 },
  image: { width: 160, height: 200, backgroundColor: colors.white },
  imageFallback: { backgroundColor: colors.lilac },
  titleBar: { backgroundColor: colors.citrine, paddingHorizontal: 10, paddingVertical: 8, minHeight: 48, justifyContent: "center" },
  titleBarPerk: { backgroundColor: colors.lilac },
  title: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.blackberry, textTransform: "uppercase", letterSpacing: 0.3 },
  titlePerk: { color: colors.white },
});

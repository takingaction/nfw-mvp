import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { PressableCard } from "@/components/ui/Card";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { formatDateShort } from "@/lib/format";
import { htmlToText } from "@/lib/html";
import type { AccessOffer, RedemptionMethod } from "@/types/perks";

type Props = {
  offer: AccessOffer;
  nationwide?: boolean;
  onPress: () => void;
};

const METHOD_ICON: Record<RedemptionMethod, keyof typeof Ionicons.glyphMap> = {
  link: "globe-outline",
  instore: "storefront-outline",
  instore_print: "print-outline",
  call: "call-outline",
};

/**
 * Web: components/perks/OfferCard.tsx — image (offer_photo_url || logo_url),
 * savings badge, title, store name, city or ONLINE, expiry, method icons, first category.
 */
export function OfferCard({ offer, nationwide, onPress }: Props) {
  const image = offer.offer_photo_url || offer.logo_url;
  const isOnline = offer.search_distance === undefined || offer.search_distance >= 5000;
  const place = !nationwide && !isOnline ? offer.physical_location?.city_locality : isOnline ? "ONLINE" : null;
  const category = offer.categories?.[0]?.category_name;

  return (
    <PressableCard onPress={onPress} padded={false} style={styles.card}>
      <View style={styles.row}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={100} />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
        <View style={styles.body}>
          {offer.savings_amount ? <Badge label={offer.savings_amount} tone="citrine" /> : null}
          <Subheading numberOfLines={2} style={styles.title}>
            {htmlToText(offer.title)}
          </Subheading>
          {offer.offer_store?.name ? <Caption numberOfLines={1}>{htmlToText(offer.offer_store.name)}</Caption> : null}
          <View style={styles.meta}>
            {place ? <Caption style={place === "ONLINE" ? styles.online : undefined}>{place}</Caption> : null}
            {offer.expires_on ? <Caption>· Expires {formatDateShort(offer.expires_on)}</Caption> : null}
          </View>
          <View style={styles.footer}>
            <View style={styles.methods}>
              {(offer.redemption_methods ?? []).map((m) => (
                <Ionicons key={m} name={METHOD_ICON[m] ?? "pricetag-outline"} size={14} color={colors.stone} />
              ))}
            </View>
            {category ? <Text style={styles.category}>{category}</Text> : null}
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  row: { flexDirection: "row" },
  image: { width: 110, alignSelf: "stretch", minHeight: 120, backgroundColor: colors.dove },
  imageFallback: { backgroundColor: colors.lilac },
  body: { flex: 1, padding: 12, gap: 4 },
  title: { fontSize: 15, lineHeight: 20 },
  meta: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  online: { fontFamily: fonts.uiBold, color: colors.wisteria },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  methods: { flexDirection: "row", gap: 6 },
  category: { fontFamily: fonts.ui, fontSize: 11, color: theme.textMuted },
});

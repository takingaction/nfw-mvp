import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { LikeButton } from "@/components/perks/LikeButton";
import { PressableCard } from "@/components/ui/Card";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { htmlToText } from "@/lib/html";
import type { StoreGroup } from "@/types/perks";

type Props = {
  store: StoreGroup;
  nationwide: boolean;
  onPress: () => void;
};

/**
 * Web: components/perks/StoreCard.tsx — logo, name, "X.X mi" or "ONLINE",
 * "View Offers ›", heart top-right. Offer count isn't shown on web either.
 */
export function StoreCard({ store, nationwide, onPress }: Props) {
  const isOnline = store.distance === undefined || store.distance >= 5000;
  const distanceLabel = nationwide ? null : isOnline ? "ONLINE" : `${store.distance!.toFixed(1)} mi`;

  return (
    <PressableCard onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        {store.logo_url ? (
          <Image source={{ uri: store.logo_url }} style={styles.logo} contentFit="contain" transition={100} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoFallbackText}>No Logo</Text>
          </View>
        )}
        <View style={styles.body}>
          <Subheading numberOfLines={2} style={styles.name}>
            {htmlToText(store.name)}
          </Subheading>
          <View style={styles.meta}>
            {distanceLabel && (
              <Caption style={isOnline && !nationwide ? styles.online : undefined}>{distanceLabel}</Caption>
            )}
            {store.count > 0 && <Caption>· {store.count} offer{store.count === 1 ? "" : "s"}</Caption>}
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Offers</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.aubergine} />
          </View>
        </View>
        <LikeButton storeKey={store.key} storeName={htmlToText(store.name)} logoUrl={store.logo_url} />
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  logo: { width: 56, height: 56, backgroundColor: colors.white },
  logoFallback: { backgroundColor: colors.dove, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  logoFallbackText: { fontFamily: fonts.ui, fontSize: 9, color: theme.textMuted },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 16, lineHeight: 21 },
  meta: { flexDirection: "row", gap: 4, alignItems: "center" },
  online: { fontFamily: fonts.uiBold, color: colors.wisteria },
  cta: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  ctaText: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.aubergine, letterSpacing: 0.3 },
});

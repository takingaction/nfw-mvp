import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { LikeButton } from "@/components/perks/LikeButton";
import { Badge } from "@/components/ui/Badge";
import { PressableCard } from "@/components/ui/Card";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { htmlToText } from "@/lib/html";
import type { NfwPerk } from "@/types/perks";

type Props = { perk: NfwPerk; onPress: () => void };

/**
 * Web: components/perks/NfwPerkStoreCard.tsx / NfwPerkOfferCard.tsx —
 * partner logo, aubergine "NFW Exclusive" badge, title, discount, redeemed state.
 * Likes for NFW partners use store_key = partner_name (same as web).
 */
export function NfwPerkCard({ perk, onPress }: Props) {
  return (
    <PressableCard onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        {perk.partner_logo_url ? (
          <Image source={{ uri: perk.partner_logo_url }} style={styles.logo} contentFit="contain" transition={100} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Ionicons name="star" size={22} color={colors.aubergine} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.badges}>
            <Badge label="NFW Exclusive" tone="aubergine" />
            {perk.userHasRedeemed ? <Badge label="Redeemed" tone="success" /> : null}
          </View>
          <Subheading numberOfLines={2} style={styles.title}>
            {htmlToText(perk.title)}
          </Subheading>
          {perk.partner_name ? <Caption numberOfLines={1}>{perk.partner_name}</Caption> : null}
          {perk.discount_value ? <Text style={styles.discount}>{perk.discount_value}</Text> : null}
        </View>
        {perk.partner_name ? (
          <LikeButton storeKey={perk.partner_name} storeName={perk.partner_name} logoUrl={perk.partner_logo_url} />
        ) : null}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  logo: { width: 56, height: 56, backgroundColor: colors.white },
  logoFallback: { backgroundColor: colors.dove, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  body: { flex: 1, gap: 4 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 16, lineHeight: 21 },
  discount: { fontFamily: fonts.uiBlack, fontSize: 14, color: colors.aubergine },
});

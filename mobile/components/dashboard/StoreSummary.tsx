import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Caption, Heading, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { formatDateShort } from "@/lib/format";
import { useMyClaims, useProducts } from "@/lib/queries/store";
import { DASHBOARD_CLAIM_LABELS, type ZeroDollarClaim } from "@/types/store";

const HISTORY_STATUSES = new Set(["completed", "fulfilled", "paid", "delivered", "cancelled"]);

const TONE: Record<string, BadgeTone> = {
  created: "info",
  fulfilled: "success",
  delivered: "success",
  completed: "success",
  paid: "success",
  cancelled: "danger",
  pending: "neutral",
};

/**
 * Web: components/dashboard/YourZeroDollarStoreSection.tsx (lilac band).
 * "Your Order History" (completed/fulfilled/paid/cancelled) + "Latest Offerings" (up to 8).
 */
export function StoreSummary() {
  const router = useRouter();
  const claims = useMyClaims();
  const products = useProducts();

  const history = (claims.data ?? []).filter((c) => HISTORY_STATUSES.has(c.status));
  const offerings = (products.data ?? []).filter((p) => p.mvpVisibility).slice(0, 8);

  return (
    <Section surface="lilac">
      <View style={styles.header}>
        <Heading tone="inverse">Your Zero Dollar Store</Heading>
        <Button label="Browse the Zero Dollar Store" variant="secondary" size="sm" onPress={() => router.push("/store")} />
      </View>

      <Subheading tone="inverse">Your Order History</Subheading>
      {history.length === 0 ? (
        <EmptyState inverse icon="gift-outline" title="No items ordered yet" actionLabel="Browse the Zero Dollar Store" actionVariant="secondary" onAction={() => router.push("/store")} />
      ) : (
        <View style={styles.history}>
          {history.slice(0, 5).map((c) => (
            <HistoryRow key={c.id} claim={c} onPress={() => router.push("/store/my-claims")} />
          ))}
        </View>
      )}

      <Subheading tone="inverse" style={styles.second}>
        Latest Offerings
      </Subheading>
      {offerings.length === 0 ? (
        <Caption tone="inverse">No products available</Caption>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {offerings.map((p) => (
            <Pressable
              key={p.shopifyProductId}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/store/[productId]", params: { productId: encodeURIComponent(p.shopifyProductId) } })}
              style={({ pressed }) => [styles.offer, pressed && styles.pressed]}
            >
              {p.imageUrl ? (
                <Image source={{ uri: p.imageUrl }} style={[styles.offerImage, p.status === "DRAFT" && styles.dimmed]} contentFit="cover" />
              ) : (
                <View style={[styles.offerImage, { backgroundColor: colors.dove }]} />
              )}
              {p.status === "DRAFT" && (
                <View style={styles.draftBadge}>
                  <Badge label="Dropping Soon" tone="wisteria" />
                </View>
              )}
              <View style={styles.offerTitleBar}>
                <Text style={styles.offerTitle} numberOfLines={2}>
                  {p.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Section>
  );
}

function HistoryRow({ claim, onPress }: { claim: ZeroDollarClaim; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}>
      {claim.product?.imageUrl ? (
        <Image source={{ uri: claim.product.imageUrl }} style={styles.historyImage} contentFit="cover" />
      ) : (
        <View style={[styles.historyImage, styles.historyFallback]}>
          <Ionicons name="gift-outline" size={20} color={colors.aubergine} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {claim.product?.title || "Product"}
        </Text>
        <View style={styles.historyMeta}>
          <Badge label={DASHBOARD_CLAIM_LABELS[claim.status] ?? "Processing"} tone={TONE[claim.status] ?? "neutral"} />
          <Caption>{claim.claimed_at ? formatDateShort(claim.claimed_at) : "Unknown date"}</Caption>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  history: { gap: 8 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.9)", padding: 10 },
  pressed: { opacity: 0.9 },
  historyImage: { width: 48, height: 48, backgroundColor: colors.dove },
  historyFallback: { alignItems: "center", justifyContent: "center" },
  historyTitle: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.blackberry },
  historyMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  second: { marginTop: 8 },
  strip: { gap: 12, paddingRight: 20 },
  offer: { width: 150 },
  offerImage: { width: 150, height: 190, backgroundColor: colors.white },
  dimmed: { opacity: 0.6 },
  draftBadge: { position: "absolute", top: 8, left: 8 },
  offerTitleBar: { backgroundColor: colors.citrine, paddingHorizontal: 10, paddingVertical: 8, minHeight: 46, justifyContent: "center" },
  offerTitle: { fontFamily: fonts.uiBold, fontSize: 11, color: colors.blackberry, textTransform: "uppercase", letterSpacing: 0.3 },
});

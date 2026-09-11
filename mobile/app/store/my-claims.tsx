import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen } from "@/components/ui/Screen";
import { Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { formatDateShort } from "@/lib/format";
import { useMyClaims } from "@/lib/queries/store";
import { CLAIM_STATUS_INFO, type ZeroDollarClaim } from "@/types/store";

/**
 * Web equivalent: app/store/my-claims/page.tsx + components/MyClaimsClient.tsx
 * Build phase: 6
 *
 * Uses /api/store/claims/my-claims-simple (latest 5 claims, all statuses). The web page
 * lists every claim via the service role; a paginated API is a follow-up (see blueprint).
 * "View on Shopify" stays hidden, matching the web's current TODO.
 */
export default function MyClaimsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const claims = useMyClaims();
  const [refreshing, setRefreshing] = useState(false);

  if (claims.isLoading) return <LoadingScreen />;
  if (claims.isError) return <ErrorScreen message={(claims.error as Error).message} onRetry={() => claims.refetch()} />;

  return (
    <FlatList
      data={claims.data ?? []}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <ClaimCard claim={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>My Claims</Text>
            <Caption>Track your claimed items and shipping status</Caption>
          </View>
          <Button label="Browse Store" variant="secondary" size="sm" onPress={() => router.push("/store")} />
        </View>
      }
      ListEmptyComponent={
        <Card>
          <EmptyState
            icon="cube-outline"
            title="No Claims Yet"
            message="You haven't claimed any items from the Zero Dollar Store yet. Browse our selection of free products."
            actionLabel="Browse Available Items"
            onAction={() => router.push("/store")}
          />
        </Card>
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      style={styles.screen}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await claims.refetch();
        setRefreshing(false);
      }}
    />
  );
}

function ClaimCard({ claim }: { claim: ZeroDollarClaim }) {
  const info = CLAIM_STATUS_INFO[claim.status] ?? { label: claim.status, description: "Status unknown", tone: "neutral" as const };
  const orderNumber = claim.shopify_order_id?.split("/").pop();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {claim.product?.imageUrl ? (
          <Image source={{ uri: claim.product.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="cube-outline" size={28} color={colors.aubergine} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {claim.product?.title || "Product"}
          </Text>
          <Badge label={info.label} tone={info.tone} />
          <Caption>{info.description}</Caption>
          {orderNumber ? <Caption>Order #{orderNumber}</Caption> : null}
        </View>
      </View>

      {(claim.tracking_url || claim.tracking_number) && (
        <View style={styles.tracking}>
          {claim.tracking_url ? (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(claim.tracking_url!)} style={styles.trackRow}>
              <Ionicons name="navigate-outline" size={16} color={colors.aubergine} />
              <Text style={styles.trackLink}>Track Package</Text>
            </Pressable>
          ) : null}
          {claim.tracking_number ? <Caption>Tracking: {claim.tracking_number}</Caption> : null}
        </View>
      )}

      <Caption style={styles.footer}>Claimed {formatDateShort(claim.claimed_at)}</Caption>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: theme.text },
  card: { gap: 10 },
  row: { flexDirection: "row", gap: 12 },
  image: { width: 84, height: 84, backgroundColor: colors.dove },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  productTitle: { fontFamily: fonts.uiBlack, fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase", color: theme.text },
  tracking: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trackLink: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, textDecorationLine: "underline" },
  footer: { paddingTop: 6 },
});


import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LikeButton } from "@/components/perks/LikeButton";
import { OfferCard } from "@/components/perks/OfferCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { useOffersInfinite } from "@/lib/queries/perks";
import { usePerksFilters } from "@/stores/perksFilters";
import { NATIONWIDE_DISTANCE } from "@/types/perks";

/**
 * Web equivalent: app/perks/page.tsx offers view with `selectedStore` set
 * (tapping a StoreCard). On mobile this is a pushed screen instead of an in-place
 * view swap, so "back" naturally restores the stores list + filters.
 * Build phase: 4
 */
export default function StoreOffersScreen() {
  const { storeKey, name, logo } = useLocalSearchParams<{ storeKey: string; name?: string; logo?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const distance = usePerksFilters((s) => s.distance);
  const nationwide = distance === NATIONWIDE_DISTANCE;

  // Web clears categories/facets/offer types/query when entering a store; keep ZIP + distance.
  const offers = useOffersInfinite(
    { store_key: storeKey, category_key: [], facet: [], offer_types: [], query: "", per_page: 25 },
    { enabled: !!storeKey },
  );
  const items = useMemo(() => offers.data?.pages.flatMap((p) => p.offers ?? []) ?? [], [offers.data]);
  const total = offers.data?.pages[0]?.info?.total_results ?? items.length;
  const storeName = name || items[0]?.offer_store?.name || "Store";
  const logoUrl = logo || items[0]?.offer_store?.logo_url;

  return (
    <>
      <Stack.Screen options={{ title: storeName }} />
      <FlatList
        data={items}
        keyExtractor={(o, i) => `${o.offer_group_key ?? o.offer_key}-${i}`}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            nationwide={nationwide}
            onPress={() => router.push({ pathname: "/(tabs)/perks/[offerKey]", params: { offerKey: String(item.offer_key), storeKey } })}
          />
        )}
        ListHeaderComponent={
          <Card style={styles.storeHeader}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" /> : null}
            <View style={{ flex: 1 }}>
              <Subheading>{storeName}</Subheading>
              <Caption>{offers.isLoading ? "Loading offers…" : `${total} offer${total === 1 ? "" : "s"}`}</Caption>
            </View>
            <LikeButton storeKey={storeKey} storeName={storeName} logoUrl={logoUrl} />
          </Card>
        }
        ListEmptyComponent={
          offers.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.aubergine} />
            </View>
          ) : (
            <EmptyState icon="pricetags-outline" title="No offers right now" message="This store has no active offers in your area." />
          )
        }
        ListFooterComponent={
          offers.hasNextPage ? (
            <Button label="Load more" variant="ghost" size="sm" loading={offers.isFetchingNextPage} onPress={() => offers.fetchNextPage()} style={styles.loadMore} />
          ) : null
        }
        onEndReached={() => offers.hasNextPage && !offers.isFetchingNextPage && offers.fetchNextPage()}
        onEndReachedThreshold={0.6}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        style={styles.screen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16 },
  storeHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  logo: { width: 56, height: 56 },
  center: { alignItems: "center", paddingVertical: 32 },
  loadMore: { alignSelf: "center", marginTop: 12 },
});

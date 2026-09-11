import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NfwPerkCard } from "@/components/perks/NfwPerkCard";
import { OfferCard } from "@/components/perks/OfferCard";
import { PerksSearchBar } from "@/components/perks/PerksSearchBar";
import { StoreCard } from "@/components/perks/StoreCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Body, Caption, Label } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { fetchProfileZip } from "@/lib/api/perks";
import { env } from "@/lib/env";
import { htmlToText } from "@/lib/html";
import {
  useCollections,
  useNfwPerks,
  useOffersInfinite,
  usePerksSettings,
  useShowNfwExclusiveButton,
  useStores,
} from "@/lib/queries/perks";
import { useAuthStore } from "@/stores/auth";
import { useLikedStores } from "@/stores/likedStores";
import { selectCanSearch, usePerksFilters } from "@/stores/perksFilters";
import { NATIONWIDE_DISTANCE, type AccessOffer, type StoreGroup } from "@/types/perks";
import { canAccessMemberBenefits } from "@/types/profile";

const PAGE_SIZE = 100; // rollup groups are built from 100 offers per page (server-side)

/**
 * Web equivalent: app/perks/page.tsx (stores / offers views; locations view omitted on mobile).
 * Build phase: 4
 */
export default function PerksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const f = usePerksFilters();
  const canSearch = usePerksFilters(selectCanSearch);
  const loadLiked = useLikedStores((s) => s.load);
  const likedLoaded = useLikedStores((s) => s.loaded);
  const listRef = useRef<FlatList>(null);

  const eligible = canAccessMemberBenefits(profile);
  const nationwide = f.distance === NATIONWIDE_DISTANCE;

  // Profile ZIP → default search location (web: fetch /api/profile on mount)
  useEffect(() => {
    if (f.profileZip !== null) return;
    fetchProfileZip()
      .then(({ zip }) => f.setProfileZip(zip ?? ""))
      .catch(() => f.setProfileZip(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!likedLoaded) void loadLiked();
  }, [likedLoaded, loadLiked]);

  const settings = usePerksSettings();
  const showNfwButton = useShowNfwExclusiveButton();
  const collections = useCollections();
  const stores = useStores();
  const offers = useOffersInfinite({}, { enabled: f.view === "offers" && !f.nfwOnly });
  const nfw = useNfwPerks(f.nfwOnly ? f.query : "");

  const offerItems = useMemo(() => offers.data?.pages.flatMap((p) => p.offers ?? []) ?? [], [offers.data]);
  const offerTotal = offers.data?.pages[0]?.info?.total_results ?? 0;
  const storeTotal = stores.data?.info.total_results ?? 0;
  const storeTotalPages = Math.max(1, Math.ceil(storeTotal / PAGE_SIZE));

  const banner = settings.data;
  const showBanner = !!banner?.hero_image_url && (!banner.is_test_mode || profile?.is_admin);

  function scrollTop() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const header = (
    <View style={styles.header}>
      {showBanner && (
        <View style={styles.banner}>
          <Image source={{ uri: banner!.hero_image_url! }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.bannerOverlay} />
          <Text style={styles.bannerHeading}>{banner!.hero_heading}</Text>
          {banner!.hero_subheading ? <Text style={styles.bannerSub}>{banner!.hero_subheading}</Text> : null}
        </View>
      )}

      {!eligible && (
        <Card surface="citrine" bordered={false} style={styles.notice}>
          <Label>Membership required</Label>
          <Caption tone="default">
            {profile?.membership_level === "waitlist"
              ? "You're on the free membership waitlist. Upgrade to unlock member perks now."
              : "Your free membership is pending approval. Upgrade to unlock member perks now."}
          </Caption>
          <Button label="Upgrade" variant="primary" size="sm" onPress={() => Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`)} style={styles.noticeButton} />
        </Card>
      )}

      <PerksSearchBar />

      {/* Quick-access row: NFW Exclusive · collections · Travel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {showNfwButton.data !== false && (
          <QuickChip
            icon="star"
            label="NFW Exclusive"
            sub="Member-only deals"
            active={f.nfwOnly}
            onPress={() => f.setNfwOnly(!f.nfwOnly)}
          />
        )}
        {(collections.data ?? []).map((c) => (
          <QuickChip
            key={c.id}
            icon="bag-handle-outline"
            label={c.name}
            sub={`${c.item_count} offer${c.item_count === 1 ? "" : "s"}`}
            onPress={() => c.slug && router.push({ pathname: "/(tabs)/perks/collections/[slug]", params: { slug: c.slug } })}
          />
        ))}
        <QuickChip icon="airplane-outline" label="Travel Benefits" sub="Hotels, Cars, Flights & More" onPress={() => router.push("/(tabs)/perks/travel")} />
      </ScrollView>

      {!f.nfwOnly && (
        <View style={styles.viewRow}>
          <View style={styles.segment}>
            {(["stores", "offers"] as const).map((v) => {
              const active = f.view === v;
              return (
                <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => f.setView(v)} style={[styles.segmentItem, active && styles.segmentActive]}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{v === "stores" ? "Stores" : "Offers"}</Text>
                </Pressable>
              );
            })}
          </View>
          <Caption>
            {f.view === "stores"
              ? stores.isFetching
                ? "Loading…"
                : storeTotal
                  ? `${stores.data?.groups.length ?? 0} of ${storeTotal} stores · Page ${f.page} of ${storeTotalPages}`
                  : ""
              : offers.isFetching && !offers.data
                ? "Loading…"
                : offerTotal
                  ? `${offerItems.length} of ${offerTotal} offers`
                  : ""}
          </Caption>
        </View>
      )}
    </View>
  );

  // ----- Result list variants -------------------------------------------------

  if (f.nfwOnly) {
    return (
      <FlatList
        ref={listRef}
        data={nfw.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <NfwPerkCard perk={item} onPress={() => item.slug && router.push({ pathname: "/(tabs)/perks/nfw/[slug]", params: { slug: item.slug } })} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={nfw.isLoading ? <Loading /> : <EmptyState icon="star-outline" title="No NFW Exclusive perks yet" message="Check back soon for member-only deals." />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={Separator}
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  if (f.view === "offers") {
    return (
      <FlatList
        ref={listRef}
        data={offerItems}
        keyExtractor={(o, i) => `${o.offer_group_key ?? o.offer_key}-${i}`}
        renderItem={({ item }) => <OfferCard offer={item} nationwide={nationwide} onPress={() => openOffer(router, item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          !canSearch ? <NeedZip /> : offers.isLoading ? <Loading /> : <EmptyState icon="pricetags-outline" title="No Results" message="Try a larger distance or fewer filters." />
        }
        ListFooterComponent={
          offers.hasNextPage ? (
            <Button label={offers.isFetchingNextPage ? "Loading…" : "Load more"} variant="ghost" size="sm" onPress={() => offers.fetchNextPage()} loading={offers.isFetchingNextPage} style={styles.loadMore} />
          ) : null
        }
        onEndReached={() => offers.hasNextPage && !offers.isFetchingNextPage && offers.fetchNextPage()}
        onEndReachedThreshold={0.6}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={Separator}
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={stores.data?.groups ?? []}
      keyExtractor={(s) => String(s.key)}
      renderItem={({ item }) => <StoreCard store={item} nationwide={nationwide} onPress={() => openStore(router, item)} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        !canSearch ? <NeedZip /> : stores.isLoading ? <Loading /> : stores.isError ? <ErrorBlock message={(stores.error as Error).message} onRetry={() => stores.refetch()} /> : <EmptyState icon="storefront-outline" title="No Results" message="Try a larger distance or fewer filters." />
      }
      ListFooterComponent={
        storeTotalPages > 1 ? (
          <View style={styles.pager}>
            <Button label="Previous" variant="ghost" size="sm" disabled={f.page <= 1} onPress={() => { f.setPage(f.page - 1); scrollTop(); }} />
            <Caption>Page {f.page} of {storeTotalPages}</Caption>
            <Button label="Next" variant="ghost" size="sm" disabled={f.page >= storeTotalPages} onPress={() => { f.setPage(f.page + 1); scrollTop(); }} />
          </View>
        ) : null
      }
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      ItemSeparatorComponent={Separator}
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
    />
  );
}

// ----- helpers ------------------------------------------------------------------

function openStore(router: ReturnType<typeof useRouter>, store: StoreGroup) {
  router.push({
    pathname: "/(tabs)/perks/store/[storeKey]",
    params: { storeKey: String(store.key), name: htmlToText(store.name), logo: store.logo_url ?? "" },
  });
}

function openOffer(router: ReturnType<typeof useRouter>, offer: AccessOffer) {
  router.push({
    pathname: "/(tabs)/perks/[offerKey]",
    params: { offerKey: String(offer.offer_key), storeKey: offer.offer_store?.store_key ? String(offer.offer_store.store_key) : "" },
  });
}

function QuickChip({ icon, label, sub, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={({ pressed }) => [styles.quickChip, active && styles.quickChipActive, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={active ? colors.white : colors.aubergine} />
      <View>
        <Text style={[styles.quickLabel, active && styles.quickLabelActive]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={[styles.quickSub, active && styles.quickSubActive]} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

function Separator() {
  return <View style={{ height: 10 }} />;
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.aubergine} />
    </View>
  );
}

function NeedZip() {
  return <EmptyState icon="location-outline" title="Enter your ZIP code" message="Add a ZIP above or choose Nationwide to start browsing perks." />;
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Body tone="muted" style={{ textAlign: "center" }}>{message}</Body>
      <Button label="Try again" variant="ghost" size="sm" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  header: { gap: 12, marginBottom: 12 },
  banner: { height: 140, justifyContent: "flex-end", padding: 16, overflow: "hidden", backgroundColor: colors.aubergine },
  bannerOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(46,31,56,0.45)" },
  bannerHeading: { fontFamily: fonts.serifSemiBold, fontSize: 24, color: colors.white },
  bannerSub: { fontFamily: fonts.serif, fontSize: 14, color: "rgba(255,255,255,0.9)" },
  notice: { gap: 6 },
  noticeButton: { alignSelf: "flex-start", marginTop: 4 },
  quickRow: { gap: 8, paddingVertical: 2 },
  quickChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, maxWidth: 220 },
  quickChipActive: { backgroundColor: colors.aubergine, borderColor: colors.aubergine },
  pressed: { opacity: 0.85 },
  quickLabel: { fontFamily: fonts.uiBold, fontSize: 12, color: theme.text },
  quickLabelActive: { color: colors.white },
  quickSub: { fontFamily: fonts.ui, fontSize: 10, color: theme.textMuted },
  quickSubActive: { color: "rgba(255,255,255,0.75)" },
  viewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  segment: { flexDirection: "row", borderWidth: 1, borderColor: colors.aubergine },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 7 },
  segmentActive: { backgroundColor: colors.aubergine },
  segmentText: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.aubergine, textTransform: "uppercase", letterSpacing: 0.5 },
  segmentTextActive: { color: colors.white },
  center: { alignItems: "center", paddingVertical: 32, gap: 12 },
  loadMore: { alignSelf: "center", marginTop: 12 },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
});

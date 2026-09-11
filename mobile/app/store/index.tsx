import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductCard } from "@/components/store/ProductCard";
import { StoreUnavailableModal } from "@/components/store/StoreUnavailableModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen } from "@/components/ui/Screen";
import { Caption } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { canClaimProduct } from "@/lib/api/store";
import { useClaimsCheck, useProducts, useStoreSettings, useSystemSettings } from "@/lib/queries/store";
import { useAuthStore } from "@/stores/auth";
import type { StoreProduct } from "@/types/store";

/**
 * Web equivalent: app/store/page.tsx + components/StoreClient.tsx
 * Build phase: 6
 *
 * Browsing is public on web; on mobile the store sits behind the auth gate (root stack)
 * so a member is always present. Claim eligibility mirrors StoreClient.canClaim().
 */
export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const products = useProducts();
  const settings = useStoreSettings();
  const system = useSystemSettings();
  const claimsCheck = useClaimsCheck();
  const [refreshing, setRefreshing] = useState(false);

  // Webhook updates claims asynchronously after Shopify checkout — re-check when we come back.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void claimsCheck.refetch();
    });
    return () => sub.remove();
  }, [claimsCheck]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([products.refetch(), claimsCheck.refetch(), system.refetch()]);
    setRefreshing(false);
  }, [products, claimsCheck, system]);

  const unavailable = system.data?.shopify_checkout_enabled === false;
  const userTier = profile?.membership_level ?? "free";
  const isApprovedFreeMember = profile?.is_approved_free_member ?? null;
  const monthlyClaimed = claimsCheck.data?.claimedThisMonth ?? false;

  function handleClaim(product: StoreProduct) {
    if (profile && !profile.profile_completed) {
      router.push("/auth/sign-up/profile");
      return;
    }
    router.push({ pathname: "/store/claim/[productId]", params: { productId: encodeURIComponent(product.shopifyProductId) } });
  }

  if (products.isLoading) return <LoadingScreen />;
  if (products.isError) return <ErrorScreen message={(products.error as Error).message} onRetry={() => products.refetch()} />;

  const hero = settings.data;

  return (
    <>
      <FlatList
        data={products.data ?? []}
        keyExtractor={(p) => p.shopifyProductId}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            eligibility={canClaimProduct(item, { userTier, isApprovedFreeMember, monthlyClaimed })}
            onClaim={() => handleClaim(item)}
            onMoreInfo={() => router.push({ pathname: "/store/[productId]", params: { productId: encodeURIComponent(item.shopifyProductId) } })}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              {hero?.hero_image_url ? <Image source={{ uri: hero.hero_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <View style={styles.heroOverlay} />
              <Text style={styles.heroHeading}>{hero?.hero_heading || "Zero Dollar Store"}</Text>
              <Text style={styles.heroSub}>{hero?.hero_subheading || "Browse our selection"}</Text>
            </View>
            {monthlyClaimed && <Caption style={styles.monthly}>You&apos;ve claimed your item for this month. Come back next month for another.</Caption>}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="cube-outline" title="No items available yet. Check back soon!" />}
        ListFooterComponent={
          <Pressable accessibilityRole="link" onPress={() => router.push("/store/my-claims")} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>View Your Claims →</Text>
          </Pressable>
        }
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        style={styles.screen}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <StoreUnavailableModal visible={unavailable} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16 },
  header: { marginBottom: 14, gap: 10 },
  hero: { height: 180, justifyContent: "flex-end", padding: 18, backgroundColor: colors.aubergine, overflow: "hidden" },
  heroOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(46,31,56,0.4)" },
  heroHeading: { fontFamily: fonts.serif, fontSize: 30, color: colors.white },
  heroSub: { fontFamily: fonts.serif, fontSize: 14, color: "rgba(255,255,255,0.9)" },
  monthly: { textAlign: "center" },
  footerLink: { alignItems: "center", paddingVertical: 20 },
  footerLinkText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, letterSpacing: 0.3 },
});

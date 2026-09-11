import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Label } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { canClaimProduct, groupVariantOptions } from "@/lib/api/store";
import { decodeEntities, extractLinks, htmlToText } from "@/lib/html";
import { useClaimsCheck, useProducts } from "@/lib/queries/store";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: components/ProductDetailPanel.tsx (slide-out) — full screen on mobile.
 * Image carousel with dots, status badge, "Value: $X.XX", HTML description as text + links,
 * "Available Options" grouped by name, Product ID. Plus a Claim button (web keeps it on the card).
 * Build phase: 6
 */
export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profile = useAuthStore((s) => s.profile);
  const products = useProducts();
  const claimsCheck = useClaimsCheck();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  if (products.isLoading) return <LoadingScreen />;
  if (products.isError) return <ErrorScreen message={(products.error as Error).message} onRetry={() => products.refetch()} />;

  const decodedId = decodeURIComponent(productId ?? "");
  const product = products.data?.find((p) => p.shopifyProductId === decodedId);
  if (!product) return <ErrorScreen message="This product is no longer available." onRetry={() => router.replace("/store")} />;

  const images = product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const slideWidth = width - 32;
  const eligibility = canClaimProduct(product, {
    userTier: profile?.membership_level ?? "free",
    isApprovedFreeMember: profile?.is_approved_free_member ?? null,
    monthlyClaimed: claimsCheck.data?.claimedThisMonth ?? false,
  });
  const optionGroups = groupVariantOptions(product);
  const descriptionHtml = decodeEntities(product.description);
  const descriptionText = htmlToText(descriptionHtml);
  const links = extractLinks(descriptionHtml);
  const numericId = product.shopifyProductId.split("/").pop();

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
  }
  function goTo(i: number) {
    scrollRef.current?.scrollTo({ x: i * slideWidth, animated: true });
    setIndex(i);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Product Details" }} />
      <Screen>
        {/* Carousel */}
        {images.length > 0 && (
          <View>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScroll}
              style={{ width: slideWidth }}
            >
              {images.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={[styles.slide, { width: slideWidth }]} contentFit="cover" transition={150} />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <Pressable key={i} accessibilityLabel={`Image ${i + 1}`} hitSlop={6} onPress={() => goTo(i)} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Title + status */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{product.title}</Text>
          {product.status === "DRAFT" ? <Badge label="Dropping Soon" tone="wisteria" /> : !product.availableForSale ? <Badge label="Out of Stock" tone="aubergine" /> : null}
        </View>
        {product.compareAtPrice && product.compareAtPrice > 0 ? <Caption>Value: ${product.compareAtPrice.toFixed(2)}</Caption> : null}

        {/* Description */}
        {descriptionText ? (
          <View style={styles.block}>
            <Body style={styles.description}>{descriptionText}</Body>
            {links.map((l) => (
              <Pressable key={l.href} onPress={() => WebBrowser.openBrowserAsync(l.href)}>
                <Text style={styles.link}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Options */}
        {optionGroups.length > 0 && (
          <Card surface="dove" bordered={false} style={styles.block}>
            <Label>Available Options</Label>
            {optionGroups.map((g) => (
              <View key={g.name} style={styles.optionRow}>
                <Caption style={styles.optionName}>{g.name}:</Caption>
                <View style={styles.chips}>
                  {g.values.map((v) => (
                    <View key={v} style={styles.chip}>
                      <Text style={styles.chipText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.block}>
          <Button
            label={eligibility.eligible ? "Claim Item" : eligibility.reason}
            variant="accent"
            disabled={!eligibility.eligible}
            onPress={() => router.push({ pathname: "/store/claim/[productId]", params: { productId: encodeURIComponent(product.shopifyProductId) } })}
            fullWidth
          />
        </View>

        <View style={styles.footer}>
          <Caption>Product ID</Caption>
          <Caption>{numericId}</Caption>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  slide: { aspectRatio: 3 / 4, backgroundColor: colors.dove },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(46,31,56,0.3)" },
  dotActive: { backgroundColor: colors.aubergine },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 18 },
  title: { flex: 1, fontFamily: fonts.uiBlack, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: theme.text },
  block: { marginTop: 16, gap: 8 },
  description: { fontSize: 15, lineHeight: 23 },
  link: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, textDecorationLine: "underline" },
  optionRow: { gap: 6 },
  optionName: { fontFamily: fonts.uiBold, color: theme.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: "rgba(163,163,163,0.2)", paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontFamily: fonts.ui, fontSize: 13, color: theme.text },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
});

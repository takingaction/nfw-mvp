import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StoreUnavailableModal } from "@/components/store/StoreUnavailableModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BrandModal } from "@/components/ui/Modal";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { groupVariantOptions, resolveVariantId, unavailableOptionValues } from "@/lib/api/store";
import { useCreateCheckout, useProducts } from "@/lib/queries/store";

/**
 * Web equivalent: components/ClaimItemModal.tsx
 * Build phase: 6
 *
 * "You're about to claim:" → option pickers (out-of-stock values disabled) → "Claim Now"
 * → "Confirm Your Claim" (one claim per month) → POST /api/shopify/checkout →
 * Shopify hosted checkout opens in the in-app browser (collects shipping there).
 * 503 shopify_unavailable → StoreUnavailableModal. Other errors shown inline.
 */
export default function ClaimItemScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const products = useProducts();
  const checkout = useCreateCheckout();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [done, setDone] = useState(false);

  if (products.isLoading) return <LoadingScreen />;
  if (products.isError) return <ErrorScreen message={(products.error as Error).message} onRetry={() => products.refetch()} />;

  const product = products.data?.find((p) => p.shopifyProductId === decodeURIComponent(productId ?? ""));
  if (!product) return <ErrorScreen message="This product is no longer available." onRetry={() => router.replace("/store")} />;

  const groups = groupVariantOptions(product);
  const unavailableValues = unavailableOptionValues(product);

  function handleClaimNow() {
    setError(null);
    const missing = groups.filter((g) => !selected[g.name]).map((g) => g.name);
    if (missing.length) {
      setError(`Please select: ${missing.join(", ")}`);
      return;
    }
    for (const g of groups) {
      if (unavailableValues.has(`${g.name}::${selected[g.name]}`)) {
        setError(`Selected ${g.name} "${selected[g.name]}" is out of stock. Please choose another.`);
        return;
      }
    }
    setConfirming(true);
  }

  async function handleConfirm() {
    setConfirming(false);
    setError(null);
    try {
      const res = await checkout.mutateAsync({ variantId: resolveVariantId(product!, selected), productId: product!.shopifyProductId });
      setDone(true);
      await WebBrowser.openBrowserAsync(res.checkoutUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { shopify_unavailable?: boolean } | null;
        if (err.status === 503 || body?.shopify_unavailable) {
          setUnavailable(true);
          return;
        }
        setError(err.message || "Failed to create checkout");
      } else {
        setError(err instanceof Error ? err.message : "Failed to create checkout");
      }
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Claim Item" }} />
      <Screen>
        <View style={styles.headerRow}>
          <Ionicons name="cube-outline" size={22} color={colors.aubergine} />
          <Heading style={styles.heading}>Claim Item</Heading>
        </View>

        <Card surface="dove" bordered={false} style={styles.itemCard}>
          <Caption>You&apos;re about to claim:</Caption>
          <Text style={styles.itemName}>{product.title}</Text>
        </Card>

        {done ? (
          <Card style={[styles.block, styles.successCard]}>
            <View style={styles.headerRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              <Label>Checkout started</Label>
            </View>
            <Body>Finish your order in the Shopify checkout window. Your claim will appear under My Claims once the order is placed.</Body>
            <Button label="View My Claims" variant="primary" onPress={() => router.replace("/store/my-claims")} />
            <Button label="Back to Store" variant="ghost" onPress={() => router.replace("/store")} />
          </Card>
        ) : (
          <>
            {groups.length > 0 && (
              <View style={styles.block}>
                <Label>Select your options:</Label>
                {groups.map((g) => (
                  <View key={g.name} style={styles.group}>
                    <Caption style={styles.groupName}>{g.name}</Caption>
                    <View style={styles.chips}>
                      {g.values.map((v) => {
                        const isOut = unavailableValues.has(`${g.name}::${v}`);
                        const active = selected[g.name] === v;
                        return (
                          <Pressable
                            key={v}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active, disabled: isOut }}
                            disabled={isOut}
                            onPress={() => setSelected((s) => ({ ...s, [g.name]: v }))}
                            style={[styles.chip, active && styles.chipActive, isOut && styles.chipDisabled]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {v}
                              {isOut ? " (Out of Stock)" : ""}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {error && (
              <Card style={[styles.block, styles.errorCard]}>
                <Body style={{ color: "#991B1B" }}>{error}</Body>
              </Card>
            )}

            <View style={styles.block}>
              <Button label={checkout.isPending ? "Redirecting..." : "Claim Now"} variant="accent" loading={checkout.isPending} onPress={handleClaimNow} fullWidth />
              <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: 8 }} />
              <Caption style={styles.footnote}>You&apos;ll be redirected to Shopify to complete your order.</Caption>
            </View>
          </>
        )}
      </Screen>

      <BrandModal
        visible={confirming}
        title="Confirm Your Claim"
        onRequestClose={() => setConfirming(false)}
        footer={
          <>
            <Button label="Go Back" variant="ghost" onPress={() => setConfirming(false)} />
            <Button label="Confirm & Claim" variant="primary" onPress={handleConfirm} style={{ flex: 1 }} />
          </>
        }
      >
        <Body>
          You are about to claim <Text style={styles.bold}>{product.title}</Text>. You have one claim per month.
        </Body>
      </BrandModal>

      <StoreUnavailableModal visible={unavailable} />
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 22 },
  itemCard: { marginTop: 14, gap: 4 },
  itemName: { fontFamily: fonts.uiBlack, fontSize: 14, letterSpacing: 0.8, textTransform: "uppercase", color: theme.text },
  block: { marginTop: 18, gap: 10 },
  group: { gap: 6 },
  groupName: { fontFamily: fonts.uiBold, color: theme.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: theme.border, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.aubergine, borderColor: colors.aubergine },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13, color: theme.text },
  chipTextActive: { color: colors.white },
  errorCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  successCard: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4", gap: 10 },
  footnote: { textAlign: "center", marginTop: 10 },
  bold: { fontFamily: fonts.serifBold },
});

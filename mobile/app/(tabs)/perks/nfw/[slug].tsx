import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LikeButton } from "@/components/perks/LikeButton";
import { PromoCode } from "@/components/perks/RedemptionResult";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label, Subheading } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { htmlToText } from "@/lib/html";
import { useNfwPerk, useRedeemNfwPerk } from "@/lib/queries/perks";

/**
 * Web equivalent: app/perks/nfw/[slug]/page.tsx + components/perks/NfwPerkDetailPanel.tsx
 * Build phase: 5
 *
 * "Redeem Online" records the redemption (POST /api/nfw-perks/[id]/redeem) and opens
 * the partner landing page. Once redeemed, the coupon code (if any) can be revealed.
 */
export default function NfwPerkDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const perk = useNfwPerk(slug);
  const redeem = useRedeemNfwPerk();
  const [showCoupon, setShowCoupon] = useState(false);
  const [redeemedNow, setRedeemedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (perk.isLoading) return <LoadingScreen />;
  if (perk.isError) {
    const status = perk.error instanceof ApiError ? perk.error.status : 0;
    return <ErrorScreen message={status === 404 ? "This perk is no longer available." : (perk.error as Error).message} onRetry={() => perk.refetch()} />;
  }
  if (!perk.data) return <ErrorScreen message="This perk is no longer available." />;

  const p = perk.data;
  const redeemed = p.userHasRedeemed || redeemedNow;
  const expired = !!p.expires_at && new Date(p.expires_at) < new Date();

  async function handleRedeem() {
    if (!p.landing_page_url) return;
    setError(null);
    if (redeemed) {
      // Already redeemed: just open the partner site (no second redemption row)
      setShowCoupon(true);
      void WebBrowser.openBrowserAsync(p.landing_page_url);
      return;
    }
    try {
      const res = await redeem.mutateAsync(p.id);
      setRedeemedNow(true);
      setShowCoupon(true);
      void WebBrowser.openBrowserAsync(res.landingPageUrl || p.landing_page_url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to redeem perk";
      if (/already redeemed/i.test(message)) {
        setRedeemedNow(true);
        setShowCoupon(true);
        void WebBrowser.openBrowserAsync(p.landing_page_url);
      } else {
        setError(message);
      }
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: p.partner_name || "NFW Exclusive" }} />
      <Screen>
        <Card style={styles.header}>
          <View style={styles.row}>
            {p.partner_logo_url ? (
              <Image source={{ uri: p.partner_logo_url }} style={styles.logo} contentFit="contain" />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Ionicons name="star" size={26} color={colors.aubergine} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Badge label="NFW Exclusive" tone="aubergine" />
              {p.partner_name ? <Subheading>{p.partner_name}</Subheading> : null}
            </View>
            {p.partner_name ? <LikeButton storeKey={p.partner_name} storeName={p.partner_name} logoUrl={p.partner_logo_url} /> : null}
          </View>
        </Card>

        <View style={styles.block}>
          <Heading>{htmlToText(p.title)}</Heading>
          {p.discount_value ? <Text style={styles.discount}>{p.discount_value}</Text> : null}
          {p.description ? <Body>{htmlToText(p.description)}</Body> : null}
        </View>

        <Card surface="dove" bordered={false} style={styles.block}>
          <Label>About This Perk</Label>
          {p.estimated_value > 0 ? <Caption>Estimated value: {formatCurrency(p.estimated_value)}</Caption> : null}
          {p.categories?.length ? <Caption>Categories: {p.categories.join(", ")}</Caption> : null}
          {p.expires_at ? <Caption>{expired ? "Expired" : "Expires"} {formatDateLong(p.expires_at)}</Caption> : null}
          {p.max_redemptions_total > 0 ? <Caption>Limited to {p.max_redemptions_total} total redemptions</Caption> : null}
        </Card>

        {p.terms_and_conditions ? (
          <Card surface="citrine" bordered={false} style={styles.block}>
            <Label>Terms & Conditions</Label>
            <Body style={styles.terms}>{htmlToText(p.terms_and_conditions)}</Body>
          </Card>
        ) : null}

        {error ? (
          <Card style={[styles.block, styles.errorCard]}>
            <Body>{error}</Body>
          </Card>
        ) : null}

        <View style={styles.block}>
          {redeemed ? (
            <Card style={styles.redeemedCard}>
              <View style={styles.inline}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Label>Redeemed</Label>
              </View>
              <Caption>You&apos;ve already redeemed this perk. Tap below to visit the partner site again.</Caption>
              {p.coupon_code ? (
                showCoupon ? (
                  <PromoCode code={p.coupon_code} />
                ) : (
                  <Button label="Reveal Promo Code" variant="ghost" size="sm" onPress={() => setShowCoupon(true)} />
                )
              ) : null}
            </Card>
          ) : null}

          <Button
            label={expired ? "Perk Expired" : redeemed ? "Visit Partner Site" : "Redeem Online"}
            variant={redeemed ? "ghost" : "primary"}
            loading={redeem.isPending}
            disabled={expired || !p.landing_page_url}
            onPress={handleRedeem}
            fullWidth
            style={{ marginTop: 10 }}
          />
          <Caption style={{ marginTop: 8 }}>Online redemptions open in your browser.</Caption>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {},
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 64, height: 64, backgroundColor: colors.white },
  logoFallback: { backgroundColor: colors.dove, alignItems: "center", justifyContent: "center" },
  block: { marginTop: 16, gap: 8 },
  discount: { fontFamily: fonts.uiBlack, fontSize: 18, color: colors.aubergine },
  terms: { fontSize: 14, lineHeight: 20 },
  errorCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  redeemedCard: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
});

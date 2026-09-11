import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LikeButton } from "@/components/perks/LikeButton";
import { LocationPicker } from "@/components/perks/LocationPicker";
import { HtmlInstructions, PromoCode, RedemptionResultCard, type RedemptionOutcome } from "@/components/perks/RedemptionResult";
import { Badge } from "@/components/ui/Badge";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { ApiError } from "@/lib/api";
import { formatDateLong } from "@/lib/format";
import { extractPhone, firstUrl, htmlToText, simplifyRedemptionMessage } from "@/lib/html";
import { resolveLocationOfferKey, useOffer, useRedeemOffer, useRedemptionCheck, useUsesRemaining } from "@/lib/queries/perks";
import { useAuthStore } from "@/stores/auth";
import { usePerksFilters } from "@/stores/perksFilters";
import { REDEMPTION_METHOD_LABELS, type RedeemResponse, type RedemptionMethod } from "@/types/perks";

const METHOD_VARIANT: Record<RedemptionMethod, ButtonVariant> = {
  link: "primary",
  instore: "tertiary",
  instore_print: "secondary",
  call: "accent",
};

/**
 * Web equivalent: app/perks/[offerKey]/page.tsx + components/perks/OfferDetailPanel.tsx
 * Build phase: 5
 *
 * Flow: offer → uses-remaining → redemption check → (multi-location) location picker
 *   → terms → result / custom instructions → uses badge → redeemed state → redeem buttons.
 * Selecting a location swaps in the location-specific offer_key before redeeming.
 */
export default function OfferDetailScreen() {
  const { offerKey } = useLocalSearchParams<{ offerKey: string; storeKey?: string }>();
  const profileZip = usePerksFilters((s) => s.profileZip);
  const profile = useAuthStore((s) => s.profile);

  const offer = useOffer(offerKey);
  const uses = useUsesRemaining(offerKey);
  const redeemedCheck = useRedemptionCheck(offerKey);
  const redeem = useRedeemOffer();

  const [selectedLocation, setSelectedLocation] = useState<{ key: string; name: string; street: string } | null>(null);
  const [locationOfferKey, setLocationOfferKey] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RedemptionOutcome | null>(null);
  const [customInstructions, setCustomInstructions] = useState<{ html: string; terms?: string; promo: string | null; url: string | null; method: "instore" | "instore_print" } | null>(null);
  const [activeMethod, setActiveMethod] = useState<RedemptionMethod | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);

  if (offer.isLoading) return <LoadingScreen />;
  if (offer.isError) {
    const status = offer.error instanceof ApiError ? offer.error.status : 0;
    return <ErrorScreen message={status === 401 ? "Please sign in to view this offer." : (offer.error as Error).message} onRetry={() => offer.refetch()} />;
  }
  if (!offer.data) return <ErrorScreen message="This offer is no longer available." />;

  const o = offer.data;
  const store = o.offer_store;
  const storeName = htmlToText(store?.name);
  const methods = (o.redemption_methods ?? []).filter((m): m is RedemptionMethod => m in REDEMPTION_METHOD_LABELS);
  const usesLeft = uses.data?.number_of_uses_remaining;
  const showUses = typeof usesLeft === "number" && usesLeft >= 0;
  const limitReached = usesLeft === 0;
  const redeemedMethod = redeemedCheck.data?.redeemed ? redeemedCheck.data.redeem_type : null;
  const knownCoupon = redeemedCheck.data?.coupon_code ?? null;
  const terms = o.terms_of_use || o.terms_and_conditions;
  const description = o.long_description || o.description || o.teaser;
  const isMultiLocation = !!o.offer_group_key;
  const hasInstore = methods.includes("instore") || methods.includes("instore_print");

  async function handleSelectLocation(loc: { key: string; name: string; street: string }) {
    setSelectedLocation(loc);
    setLocationOfferKey(null);
    if (o.offer_group_key) {
      const k = await resolveLocationOfferKey(o.offer_group_key, loc.key).catch(() => null);
      setLocationOfferKey(k);
    }
  }

  async function handleRedeem(method: RedemptionMethod) {
    setActiveMethod(method);
    setOutcome(null);
    setCustomInstructions(null);
    const key = locationOfferKey ?? offerKey;
    try {
      const data: RedeemResponse = await redeem.mutateAsync({ offerKey: key, method, locationKey: selectedLocation?.key });
      const promo = data.promotion_code || data.coupon_code || null;
      const url = firstUrl(data.redemption_url) ?? data.redemption_url ?? null;
      const locationLabel = selectedLocation ? `${selectedLocation.name}${selectedLocation.street ? ` at ${selectedLocation.street}` : ""}` : null;

      if (method === "link") {
        setShowCoupon(true);
        setOutcome({ kind: "link", url, promoCode: promo, message: simplifyRedemptionMessage(data.display_message || data.instructions, promo) });
        if (url) void WebBrowser.openBrowserAsync(url);
      } else if (method === "instore" || method === "instore_print") {
        if (data.display_message) {
          setCustomInstructions({ html: data.display_message, terms: data.terms, promo, url, method });
        } else {
          setOutcome({ kind: "coupon", method, url, promoCode: promo, locationLabel });
          if (url) void WebBrowser.openBrowserAsync(url);
        }
      } else {
        const phone = data.phone_number || o.physical_location?.phone_number || store?.phone_number || extractPhone(data.display_message || data.instructions);
        setOutcome({ kind: "call", phone, promoCode: promo, message: htmlToText(data.display_message) || data.message || null });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to redeem offer";
      setOutcome({ kind: "error", message });
    } finally {
      setActiveMethod(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: storeName || "Offer" }} />
      <Screen>
        {/* Store header */}
        <Card style={styles.storeCard}>
          <View style={styles.storeRow}>
            {store?.logo_url || o.logo_url ? (
              <Image source={{ uri: store?.logo_url || o.logo_url }} style={styles.logo} contentFit="contain" />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Subheading>{storeName || "Offer"}</Subheading>
              {store?.website ? (
                <Pressable onPress={() => WebBrowser.openBrowserAsync(store.website!)} style={styles.inline}>
                  <Ionicons name="globe-outline" size={14} color={colors.aubergine} />
                  <Text style={styles.link}>Visit Website</Text>
                </Pressable>
              ) : null}
            </View>
            {store?.store_key ? <LikeButton storeKey={store.store_key} storeName={storeName} logoUrl={store.logo_url} /> : null}
          </View>
          <View style={styles.badges}>
            {o.savings_amount ? <Badge label={o.savings_amount} tone="citrine" /> : null}
            {o.discount_percent ? <Badge label={`${o.discount_percent}% Off`} tone="citrine" /> : null}
            {isMultiLocation ? <Badge label="Multiple Locations" tone="neutral" /> : null}
            {(o.categories ?? []).slice(0, 2).map((c) => (
              <Badge key={c.category_key} label={c.category_name} tone="neutral" />
            ))}
          </View>
          {o.expires_on ? <Caption>Expires {formatDateLong(o.expires_on)}</Caption> : null}
        </Card>

        {/* Title + description */}
        <View style={styles.block}>
          <Heading>{htmlToText(o.title)}</Heading>
          {description ? <Body style={styles.description}>{htmlToText(description)}</Body> : null}
        </View>

        {/* Locations */}
        {isMultiLocation && (
          <View style={styles.block}>
            <LocationPicker offerGroupKey={o.offer_group_key!} profileZip={profileZip} selectedKey={selectedLocation?.key ?? null} onSelect={handleSelectLocation} />
          </View>
        )}
        {!isMultiLocation && o.physical_location && (
          <Card style={styles.block}>
            <Label>Location</Label>
            {o.physical_location.location_name ? <Body>{htmlToText(o.physical_location.location_name)}</Body> : null}
            <Caption>
              {[o.physical_location.street_address || o.physical_location.address_line_1, o.physical_location.extended_street_address].filter(Boolean).join(", ")}
            </Caption>
            <Caption>
              {[o.physical_location.city_locality, o.physical_location.state_region].filter(Boolean).join(", ")} {o.physical_location.postal_code ?? ""}
            </Caption>
          </Card>
        )}

        {/* Terms */}
        {terms ? (
          <Card surface="citrine" bordered={false} style={styles.block}>
            <Label>Terms of Use</Label>
            <Caption tone="default">These terms apply when redeeming this offer</Caption>
            <Body style={styles.terms}>{htmlToText(terms)}</Body>
          </Card>
        ) : null}

        {/* Result / custom instructions */}
        {outcome && (
          <View style={styles.block}>
            <RedemptionResultCard outcome={outcome} onDismiss={() => setOutcome(null)} />
          </View>
        )}
        {customInstructions && (
          <Card style={[styles.block, styles.instructionsCard]}>
            <Label>Redemption Instructions</Label>
            <HtmlInstructions html={customInstructions.html} />
            {customInstructions.terms ? (
              <Caption>
                <Text style={{ fontFamily: fonts.uiBold }}>Terms: </Text>
                {htmlToText(customInstructions.terms)}
              </Caption>
            ) : null}
            {customInstructions.promo ? <PromoCode code={customInstructions.promo} /> : null}
            <View style={styles.instructionsActions}>
              <Button
                label="Continue"
                variant="primary"
                onPress={() => {
                  if (customInstructions.url) void WebBrowser.openBrowserAsync(customInstructions.url);
                  setOutcome({ kind: "coupon", method: customInstructions.method, url: customInstructions.url, promoCode: customInstructions.promo, locationLabel: selectedLocation?.name ?? null });
                  setCustomInstructions(null);
                }}
                style={{ flex: 1 }}
              />
              <Button label="Cancel" variant="ghost" onPress={() => setCustomInstructions(null)} />
            </View>
          </Card>
        )}

        {/* Uses remaining */}
        {showUses && (
          <Card surface="citrine" bordered={false} style={styles.block}>
            <Label>{limitReached ? "No Uses Remaining" : `${usesLeft} Use${usesLeft === 1 ? "" : "s"} Remaining`}</Label>
            {!limitReached && usesLeft <= 3 ? <Caption tone="default">Using this offer will consume one of your available redemptions</Caption> : null}
          </Card>
        )}

        {/* Redeemed state + coupon reveal */}
        {redeemedMethod && knownCoupon && (
          <Card style={[styles.block, styles.redeemedCard]}>
            <View style={styles.inline}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Label>Redeemed</Label>
            </View>
            <Caption>You&apos;ve already redeemed this perk. Redeem again to visit the partner site.</Caption>
            {showCoupon ? <PromoCode code={knownCoupon} /> : <Button label="Reveal Promo Code" variant="ghost" size="sm" onPress={() => setShowCoupon(true)} />}
          </Card>
        )}

        {/* Redeem buttons */}
        <View style={styles.block}>
          <Heading style={styles.redeemHeading}>Redeem This Offer</Heading>
          {hasInstore && <Caption style={{ marginBottom: 8 }}>Please confirm with your store that coupon is valid before redeeming.</Caption>}
          {isMultiLocation && selectedLocation && !locationOfferKey && <Caption style={{ marginBottom: 8 }}>Preparing coupon for {selectedLocation.name}…</Caption>}
          <View style={styles.buttons}>
            {methods.length === 0 && <Caption>No redemption methods available for this offer.</Caption>}
            {methods.map((m) => {
              const isThisRedeemed = redeemedMethod === m;
              const label = limitReached ? "Offer Limit Reached" : redeemedMethod ? REDEMPTION_METHOD_LABELS[m].redeemed : REDEMPTION_METHOD_LABELS[m].action;
              return (
                <Button
                  key={m}
                  label={activeMethod === m ? "Redeeming..." : label}
                  variant={isThisRedeemed ? "ghost" : METHOD_VARIANT[m]}
                  loading={activeMethod === m}
                  disabled={limitReached || activeMethod !== null || (isMultiLocation && !!selectedLocation && !locationOfferKey)}
                  onPress={() => handleRedeem(m)}
                  fullWidth
                />
              );
            })}
          </View>
          <Caption style={{ marginTop: 10 }}>Online redemptions open in your browser.</Caption>
          {profile && !profile.profile_completed ? <Caption style={{ marginTop: 4 }}>Complete your profile to redeem offers.</Caption> : null}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  storeCard: { gap: 10 },
  storeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 56, height: 56 },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, textDecorationLine: "underline" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  block: { marginTop: 16, gap: 8 },
  description: { color: theme.text },
  terms: { fontSize: 14, lineHeight: 20 },
  instructionsCard: { borderColor: colors.lilac, gap: 10 },
  instructionsActions: { flexDirection: "row", gap: 10 },
  redeemedCard: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4", gap: 8 },
  redeemHeading: { fontSize: 22 },
  buttons: { gap: 10 },
});

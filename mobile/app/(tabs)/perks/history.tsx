import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Alert, FlatList, Linking, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PromoCode } from "@/components/perks/RedemptionResult";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen } from "@/components/ui/Screen";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { ApiError } from "@/lib/api";
import { formatDateShort } from "@/lib/format";
import { htmlToText } from "@/lib/html";
import { useFreshRedemptionUrl, useRedemptions } from "@/lib/queries/perks";
import type { NfwPerkRedemption, OfferRedemption, RedemptionMethod } from "@/types/perks";

type HistoryItem =
  | { kind: "access"; id: string; when: string; r: OfferRedemption }
  | { kind: "nfw"; id: string; when: string; r: NfwPerkRedemption };

const METHOD_LABEL: Record<RedemptionMethod, string> = { link: "Online", instore: "In-Store", instore_print: "Print", call: "Call" };

/**
 * Web equivalent: app/perks/history/page.tsx + components/dashboard/RedeemedPerksPanel.tsx
 * "Open" re-mints the coupon URL via /redemptions/[id]/fresh-url because stored URLs expire.
 * Expired offers show a modal-style alert pointing to "Details".
 * Build phase: 5
 */
export default function RedemptionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const history = useRedemptions();
  const freshUrl = useFreshRedemptionUrl();
  const [opening, setOpening] = useState<string | null>(null);

  const items = useMemo<HistoryItem[]>(() => {
    const access = (history.data?.access ?? []).map<HistoryItem>((r) => ({ kind: "access", id: r.id, when: r.redeemed_at, r }));
    const nfw = (history.data?.nfw ?? []).map<HistoryItem>((r) => ({ kind: "nfw", id: `nfw-${r.id}`, when: r.redeemed_at, r }));
    return [...access, ...nfw].sort((a, b) => (a.when < b.when ? 1 : -1));
  }, [history.data]);

  if (history.isLoading) return <LoadingScreen />;
  if (history.isError) return <ErrorScreen message={(history.error as Error).message} onRetry={() => history.refetch()} />;

  async function openAccess(r: OfferRedemption) {
    if (isExpired(r.expires_at)) {
      Alert.alert("Offer Expired", "Try opening the offer details to see if a new version is available for redemption.", [{ text: "Got It" }]);
      return;
    }
    if (r.redeem_type === "call") {
      const phone = r.phone_number?.replace(/[^\d+]/g, "");
      if (phone) void Linking.openURL(`tel:${phone}`);
      return;
    }
    setOpening(r.id);
    try {
      const { url } = await freshUrl.mutateAsync(r.id);
      void WebBrowser.openBrowserAsync(url);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 410 && r.redemption_url) {
        void WebBrowser.openBrowserAsync(r.redemption_url);
      } else {
        Alert.alert("Link unavailable", "Link expired or offer no longer available. Try the offer details for a fresh version.", [{ text: "OK" }]);
      }
    } finally {
      setOpening(null);
    }
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) =>
        item.kind === "access" ? (
          <AccessRow r={item.r} opening={opening === item.r.id} onOpen={() => openAccess(item.r)} onDetails={() => router.push({ pathname: "/(tabs)/perks/[offerKey]", params: { offerKey: item.r.offer_key } })} />
        ) : (
          <NfwRow r={item.r} onDetails={() => item.r.slug && router.push({ pathname: "/(tabs)/perks/nfw/[slug]", params: { slug: item.r.slug } })} />
        )
      }
      ListHeaderComponent={<Caption style={styles.count}>{items.length} redemption{items.length === 1 ? "" : "s"}</Caption>}
      ListEmptyComponent={<EmptyState icon="pricetags-outline" title="No redemptions yet" message="Perks you redeem will show up here." actionLabel="Explore Perks" onAction={() => router.push("/(tabs)/perks")} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      style={styles.screen}
    />
  );
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function AccessRow({ r, opening, onOpen, onDetails }: { r: OfferRedemption; opening: boolean; onOpen: () => void; onDetails: () => void }) {
  const expired = isExpired(r.expires_at);
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {r.store_logo_url ? <Image source={{ uri: r.store_logo_url }} style={styles.logo} contentFit="contain" /> : <View style={[styles.logo, styles.logoFallback]} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Subheading numberOfLines={2} style={styles.title}>
            {htmlToText(r.offer_title) || "Offer"}
          </Subheading>
          {r.store_name ? <Caption numberOfLines={1}>{htmlToText(r.store_name)}</Caption> : null}
          <View style={styles.meta}>
            {r.redeem_type ? <Badge label={METHOD_LABEL[r.redeem_type]} tone="neutral" /> : null}
            {expired ? <Badge label="Expired" tone="danger" /> : r.status === "used" ? <Badge label="Used" tone="neutral" /> : <Badge label="Active" tone="success" />}
          </View>
          <Caption>
            Redeemed {formatDateShort(r.redeemed_at)}
            {r.expires_at ? ` · ${expired ? "Expired" : "Expires"} ${formatDateShort(r.expires_at)}` : ""}
          </Caption>
        </View>
      </View>
      {r.coupon_code ? <PromoCode code={r.coupon_code} /> : null}
      <View style={styles.actions}>
        <Button
          label={opening ? "Loading..." : r.redeem_type === "call" ? "Call" : "Open"}
          variant={expired ? "ghost" : "primary"}
          size="sm"
          loading={opening}
          onPress={onOpen}
          style={{ flex: 1 }}
        />
        <Button label="Details" variant="ghost" size="sm" onPress={onDetails} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

function NfwRow({ r, onDetails }: { r: NfwPerkRedemption; onDetails: () => void }) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {r.logo_url ? (
          <Image source={{ uri: r.logo_url }} style={styles.logo} contentFit="contain" />
        ) : (
          <View style={[styles.logo, styles.logoFallback, { alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="star" size={20} color={colors.aubergine} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Subheading numberOfLines={2} style={styles.title}>
            {htmlToText(r.title)}
          </Subheading>
          {r.partner_name ? <Caption numberOfLines={1}>{r.partner_name}</Caption> : null}
          <View style={styles.meta}>
            <Badge label="NFW Exclusive" tone="aubergine" />
          </View>
          <Caption>Redeemed {formatDateShort(r.redeemed_at)}</Caption>
        </View>
      </View>
      {r.coupon_code ? <PromoCode code={r.coupon_code} /> : null}
      <View style={styles.actions}>
        {r.landing_page_url ? <Button label="Open" variant="primary" size="sm" onPress={() => WebBrowser.openBrowserAsync(r.landing_page_url!)} style={{ flex: 1 }} /> : null}
        {r.slug ? <Button label="Details" variant="ghost" size="sm" onPress={onDetails} style={{ flex: 1 }} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16 },
  count: { marginBottom: 10 },
  card: { gap: 10 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  logo: { width: 48, height: 48, backgroundColor: colors.white },
  logoFallback: { backgroundColor: colors.dove },
  title: { fontSize: 15, lineHeight: 20 },
  meta: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
});


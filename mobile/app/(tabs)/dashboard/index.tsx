import { useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { DashboardBanners } from "@/components/banners/DashboardBanners";
import { BottomActions } from "@/components/dashboard/BottomActions";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { FeaturedItems } from "@/components/dashboard/FeaturedItems";
import { GrantsSummary } from "@/components/dashboard/GrantsSummary";
import { MembershipCard } from "@/components/dashboard/MembershipCard";
import { MembershipImpactCard } from "@/components/dashboard/MembershipImpactCard";
import { PerksSummary } from "@/components/dashboard/PerksSummary";
import { StoreSummary } from "@/components/dashboard/StoreSummary";
import { LoadingScreen, Screen } from "@/components/ui/Screen";
import { useDashboardSettings, usePerksCounts, useSavings } from "@/lib/queries/dashboard";
import { useMyGrants, useOpenGrantCycles } from "@/lib/queries/grants";
import { useAuthStore } from "@/stores/auth";

/**
 * Web equivalent: app/dashboard/page.tsx
 *
 * Gating (same order as web):
 *   !profile_completed                                  → sign-up step 1
 *   !membership_level                                    → sign-up step 3   (never null on mobile; normalised to "free")
 *   free && !approved && contact_submitted === null      → sign-up step 3
 *
 * Section order matches web. Differences noted in each component.
 */
export default function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const profileError = useAuthStore((s) => s.profileError);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const settings = useDashboardSettings();
  const savings = useSavings();
  const grants = useMyGrants();
  const cycles = useOpenGrantCycles();
  const perksCounts = usePerksCounts();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), queryClient.invalidateQueries()]);
    setRefreshing(false);
  }, [refreshProfile, queryClient]);

  // Approved/paid grants for cycles ending after 2026-07-12 (same cut-off as web).
  const { hasPaidOrApprovedGrant, latestGrantId } = useMemo(() => {
    const eligible = (grants.data ?? []).filter(
      (g) => (g.status === "approved" || g.status === "payment_sent") && (g.grant_cycles?.end_date ?? "") > "2026-07-12",
    );
    return { hasPaidOrApprovedGrant: eligible.length > 0, latestGrantId: eligible[0]?.id ?? null };
  }, [grants.data]);

  if (!profile) {
    return <LoadingScreen message={profileError ? `Couldn't load your profile: ${profileError}` : undefined} />;
  }

  if (!profile.profile_completed) return <Redirect href="/auth/sign-up/profile" />;
  if (
    profile.membership_level === "free" &&
    profile.is_approved_free_member !== true &&
    profile.free_membership_contact_submitted === null
  ) {
    return <Redirect href="/auth/sign-up/membership" />;
  }

  return (
    <Screen padded={false} bottomInset={false} onRefresh={onRefresh} refreshing={refreshing} contentContainerStyle={styles.content}>
      <DashboardBanners profile={profile} hasPaidOrApprovedGrant={hasPaidOrApprovedGrant} latestGrantId={latestGrantId} />

      <DashboardHero heroImage={settings.data?.hero_image_url ?? null} />

      <View style={styles.cards}>
        <MembershipCard
          memberName={profile.full_name || "Member"}
          membershipLevel={profile.membership_level}
          joinedAt={profile.joined_at}
          avatarUrl={profile.avatar_url}
          badgeFoundingUrl={settings.data?.badge_founding_url}
        />
        <MembershipImpactCard savings={savings.data} loading={savings.isLoading} />
      </View>

      <FeaturedItems items={settings.data?.featured_items ?? []} />

      <GrantsSummary grants={grants.data ?? []} availableCycles={cycles.data ?? []} />

      <PerksSummary savedBrands={perksCounts.data?.savedBrands ?? 0} redeemed={perksCounts.data?.redeemed ?? 0} />

      <StoreSummary />

      <BottomActions settings={settings.data ?? null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  cards: { padding: 20, gap: 16 },
});

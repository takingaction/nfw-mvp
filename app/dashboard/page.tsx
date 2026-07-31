import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import DashboardHero from "@/components/dashboard/DashboardHero";
import MembershipCard from "@/components/dashboard/MembershipCard";
import MembershipImpactCard from "@/components/dashboard/MembershipImpactCard";
import PopularAcrossNFW from "@/components/dashboard/PopularAcrossNFW";
import BottomActions from "@/components/dashboard/BottomActions";
import AccessPerksSync from "@/components/AccessPerksSync";
import DashboardPerksSection from "@/components/dashboard/DashboardPerksSection";
import YourMicrograntsSection from "@/components/dashboard/YourMicrograntsSection";
import YourZeroDollarStoreSection from "@/components/dashboard/YourZeroDollarStoreSection";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { AbandonedCheckoutBanner } from "@/components/dashboard/AbandonedCheckoutBanner";
import { PendingFreeMembershipBanner } from "@/components/dashboard/PendingFreeMembershipBanner";
import ConnectBankButton from "@/components/grants/ConnectBankButton";

export const metadata = {
  title: "Dashboard",
  description: "Your National Fund for Women member dashboard.",
};

async function getSavings(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [micrograntsResult, perksResult, claimsResult, nfwPerksResult] = await Promise.all([
    supabaseAdmin
      .from("grants")
      .select("payout_amount")
      .eq("user_id", userId)
      .eq("status", "paid"),
    supabaseAdmin
      .from("offer_redemptions")
      .select("offer_value")
      .eq("user_id", userId),
    supabaseAdmin
      .from("zero_dollar_claims")
      .select("shopify_product_id, shopify_variant_id")
      .eq("user_id", userId)
      .in("status", ["fulfilled", "paid", "delivered"]),
    supabaseAdmin
      .from("nfw_perk_redemptions")
      .select("perk_id")
      .eq("user_id", userId),
  ]);

  const micrograntsTotal = (micrograntsResult.data || []).reduce(
    (sum: number, g: { payout_amount: number | null }) => sum + (g.payout_amount || 0),
    0
  );

  const perksTotal = (perksResult.data || []).reduce(
    (sum: number, r: { offer_value: string | number | null }) => sum + (Number(r.offer_value) || 0),
    0
  );

  let claimsTotal = 0;
  const claims = claimsResult.data || [];
  if (claims.length > 0) {
    const variantIds = claims.map((c: { shopify_variant_id: string }) => c.shopify_variant_id);
    const { data: products } = await supabaseAdmin
      .from("shopify_product_mappings")
      .select("shopify_variant_id, compare_at_price")
      .in("shopify_variant_id", variantIds);

    const priceMap = new Map<string, number>();
    (products || []).forEach((p: { shopify_variant_id: string; compare_at_price: number | null }) => {
      priceMap.set(p.shopify_variant_id, p.compare_at_price || 0);
    });

    claimsTotal = claims.reduce((sum: number, c: { shopify_variant_id: string }) => {
      return sum + (priceMap.get(c.shopify_variant_id) || 0);
    }, 0);
  }

  let nfwPerksTotal = 0;
  const nfwPerkRedemptions = nfwPerksResult.data || [];
  if (nfwPerkRedemptions.length > 0) {
    const perkIds = nfwPerkRedemptions.map((r: { perk_id: string }) => r.perk_id);
    const { data: perks } = await supabaseAdmin
      .from("nfw_perks")
      .select("id, estimated_value")
      .in("id", perkIds);

    const perkValueMap = new Map<string, number>();
    (perks || []).forEach((p: { id: string; estimated_value: number | null }) => {
      perkValueMap.set(p.id, p.estimated_value || 0);
    });

    nfwPerksTotal = nfwPerkRedemptions.reduce((sum: number, r: { perk_id: string }) => {
      return sum + (perkValueMap.get(r.perk_id) || 0);
    }, 0);
  }

  return {
    total: micrograntsTotal + perksTotal + claimsTotal + nfwPerksTotal,
    microgrants: micrograntsTotal,
    perks: perksTotal + nfwPerksTotal,
    zeroDollarStore: claimsTotal,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // Redirect to login, preserving the attempted URL as next
    const nextUrl = searchParams?.next || "/dashboard";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [profileResult, dashboardSettingsResult, likedStoresResult, grantsResult, claimsResult, cyclesResult, abandonedCheckoutResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, joined_at")
      .eq("id", user.id)
      .single(),
    supabaseAdmin
      .from("dashboard_settings")
      .select("*")
      .limit(1)
      .single(),
    supabaseAdmin
      .from("store_likes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("grants")
      .select("*, grant_cycles(cycle_name, amount_per_grant, end_date, featured_image)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("zero_dollar_claims")
      .select("*, shopify_product_id, order_status_url, shopify_order_id")
      .eq("user_id", user.id)
      .limit(10),
    supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, amount_per_grant, end_date, featured_image, status, is_testing_only")
      .eq("status", "open")
      .order("end_date", { ascending: true })
      .limit(6),
    supabaseAdmin
      .from("abandoned_checkouts")
      .select("id")
      .eq("user_id", user.id)
      .is("recovered_at", null)
      .limit(1),
  ]);

  // Fetch shopify product mappings for enrichment
  const { data: allMappings } = await supabaseAdmin
    .from("shopify_product_mappings")
    .select("shopify_product_id, shopify_variant_id, title, image_url");

  const mappingMap = new Map(
    (allMappings || []).map(m => [m.shopify_product_id, m])
  );

  // Join claims with mappings in JavaScript
  const userClaims = (claimsResult?.data || []).map((claim: any) => ({
    ...claim,
    shopify_product_mappings: mappingMap.get(claim.shopify_product_id) || null
  }));

  const profile = profileResult?.data;

  if (!profile?.profile_completed) {
    redirect("/auth/sign-up?step=1");
  } else if (!profile?.membership_level) {
    redirect("/auth/sign-up?step=3");
  }

  // If free member has NULL contact_submitted (never started free flow), redirect to step 3
  // This catches users who have database default 'free' but never interacted with step 3
  // Skip if is_approved_free_member === TRUE (grandfathered or admin-approved members)
  if (
    profile?.membership_level === "free" &&
    profile?.is_approved_free_member !== true &&
    profile?.free_membership_contact_submitted === null
  ) {
    redirect("/auth/sign-up?step=3");
  }

  // Check for abandoned checkout for the banner display
  const hasAbandonedCheckout = (abandonedCheckoutResult?.data?.length ?? 0) > 0;

  // Show pending/waitlist banner if free or waitlist member has submitted contact but not yet approved
  const isPendingFreeMember =
    (profile?.membership_level === "free" || profile?.membership_level === "waitlist") &&
    profile?.is_approved_free_member !== true &&
    profile?.free_membership_contact_submitted === true;

  const savings = await getSavings(user.id);
  const settings = dashboardSettingsResult?.data || {};
  const likedStores = likedStoresResult?.data || [];
  const userGrants = grantsResult?.data || [];

  // Check if user has approved grants with cycle ending after July 12, 2026 (for showing bank connection banner)
  const approvedGrants = (userGrants || []).filter(
    (g: any) => g.status === "approved" &&
    g.grant_cycles?.end_date > '2026-07-12'
  );
  const hasApprovedGrant = approvedGrants.length > 0;
  // Get the most recently approved grant ID for the Connect Bank Account button
  const latestApprovedGrantId = approvedGrants[0]?.id || null;

  // Filter out testing-only cycles for non-admins
  const availableCycles = (cyclesResult?.data || []).filter(
    (cycle: any) => profile?.is_admin || !cycle.is_testing_only
  );

  // Start with featured items from settings
  let featuredItems = (settings.featured_items || []).slice(0, 5);

  // Enrich ALL microgrant items with fresh image URLs from grant_cycles
  const micrograntItems = featuredItems.filter((item: any) => item.type === "microgrant");

  if (micrograntItems.length > 0) {
    const grantIds = micrograntItems.map((item: any) => item.id.replace("grant_", ""));
    const { data: grantCycles } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, featured_image")
      .in("id", grantIds);

    if (grantCycles && grantCycles.length > 0) {
      const grantInfoMap = new Map(grantCycles.map(g => [g.id, g]));
      featuredItems = featuredItems.map((item: any) => {
        if (item.type === "microgrant") {
          const grantId = item.id.replace("grant_", "");
          const grantInfo = grantInfoMap.get(grantId);
          return {
            ...item,
            title: grantInfo?.cycle_name || item.title,
            image: grantInfo?.featured_image || item.image,
          };
        }
        return item;
      });
    }
  }

  // Enrich shopify_product items with fresh image URLs from API
  const shopifyItems = featuredItems.filter((item: any) => item.type === "shopify_product");
  if (shopifyItems.length > 0) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nationalfundforwomen.org";
      const productsRes = await fetch(`${baseUrl}/api/shopify/products`);
      if (productsRes.ok) {
        const products = await productsRes.json();
        const productMap = new Map(products.map((p: any) => [p.shopifyProductId, p.imageUrl]));
        featuredItems = featuredItems.map((item: any) => {
          if (item.type === "shopify_product") {
            const productId = item.id.replace("shopify_", "");
            const imageUrl = productMap.get(productId) || item.image;
            return { ...item, image: imageUrl };
          }
          return item;
        });
      }
    } catch (err) {
      console.error("Failed to enrich shopify product images:", err);
    }
  }

  return (
    <main className="min-h-screen">
      <AccessPerksSync userId={user.id} />
      <ProfileBanner profile={profile} />
      <AbandonedCheckoutBanner
        showRequestFreeMembershipLink={
          profile?.membership_level === "free" &&
          profile?.free_membership_contact_submitted === false
        }
      />
      {isPendingFreeMember && <PendingFreeMembershipBanner membershipLevel={profile?.membership_level} />}

      <DashboardHero heroImage={settings.hero_image_url || "/images/landing.jpg"} />

      {/* You're Approved Banner - Full Width Below Hero */}
      {hasApprovedGrant && !profile?.stripe_onboarding_completed && latestApprovedGrantId && (
        <div className="bg-nfw-citrine py-6 px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-1/2">
              <h2 className="font-serif text-2xl text-nfw-blackberry mb-1">
                YOU&apos;RE APPROVED!
              </h2>
              <p className="font-serif text-nfw-blackberry/70">
                Connect your bank account to receive your grant payments.
              </p>
              <p className="font-serif text-nfw-blackberry/70 mt-2">
                <span className="font-bold">IMPORTANT:</span> If you don&apos;t have a website, please input nationalfundforwomen.org when prompted.
              </p>
            </div>
            <ConnectBankButton grantId={latestApprovedGrantId} />
          </div>
        </div>
      )}

      {/* Already Connected Banner */}
      {hasApprovedGrant && profile?.stripe_onboarding_completed && latestApprovedGrantId && (
        <div className="bg-nfw-citrine py-6 px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="w-full sm:w-1/2">
              <h2 className="font-serif text-2xl text-nfw-blackberry mb-1">
                YOU&apos;RE APPROVED!
              </h2>
              <p className="font-serif text-nfw-blackberry/70">
                You&apos;re already connected and ready to receive payments!
              </p>
            </div>
            <span className="text-nfw-blackberry font-ui font-bold">
              Bank Connected ✓
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-0 mb-0">
        <div className="bg-nfw-dove p-6 w-full md:w-1/4">
          <MembershipCard
            memberName={profile?.full_name || "Member"}
            membershipLevel={profile?.membership_level || "free"}
            joinedAt={profile?.joined_at || ""}
            avatarUrl={profile?.avatar_url || null}
            badgeFreeUrl={settings.badge_free_url || ""}
            badgeContributingUrl={settings.badge_contributing_url || ""}
            badgeFoundingUrl={settings.badge_founding_url || ""}
          />
        </div>

        <div className="bg-nfw-aubergine p-6 w-full md:w-3/4">
          <MembershipImpactCard
            totalSavings={savings.total}
            micrograntsSavings={savings.microgrants}
            perksSavings={savings.perks}
            zeroDollarStoreSavings={savings.zeroDollarStore}
          />
        </div>
      </div>

      <PopularAcrossNFW featuredItems={featuredItems} />

      <YourMicrograntsSection
        grants={userGrants}
        availableCycles={availableCycles}
      />

      <DashboardPerksSection likedStores={likedStores} />

      <YourZeroDollarStoreSection claims={userClaims} />

      <BottomActions
        squareImage1={settings.square_image1_url || ""}
        squareImage1Link={settings.square_image1_link || "#"}
        squareImage2={settings.square_image2_url || ""}
        squareImage2Link={settings.square_image2_link || "#"}
        squareImage3={settings.square_image3_url || ""}
        squareImage3Link={settings.square_image3_link || "#"}
      />
    </main>
  );
}
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

export const metadata = {
  title: "Dashboard",
  description: "Your National Fund for Women member dashboard.",
};

async function getSavings(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [micrograntsResult, perksResult, claimsResult] = await Promise.all([
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
      .select("shopify_variant_id, price")
      .in("shopify_variant_id", variantIds);

    const priceMap = new Map<string, number>();
    (products || []).forEach((p: { shopify_variant_id: string; price: number }) => {
      priceMap.set(p.shopify_variant_id, p.price || 0);
    });

    claimsTotal = claims.reduce((sum: number, c: { shopify_variant_id: string }) => {
      return sum + (priceMap.get(c.shopify_variant_id) || 0);
    }, 0);
  }

  return {
    total: micrograntsTotal + perksTotal + claimsTotal,
    microgrants: micrograntsTotal,
    perks: perksTotal,
    zeroDollarStore: claimsTotal,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [profileResult, dashboardSettingsResult, likedStoresResult] = await Promise.all([
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
  ]);

  const profile = profileResult?.data;

  if (!profile?.profile_completed) {
    redirect("/auth/sign-up?step=1");
  } else if (!profile?.membership_level) {
    redirect("/auth/sign-up?step=3");
  }

  const savings = await getSavings(user.id);
  const settings = dashboardSettingsResult?.data || {};
  const likedStores = likedStoresResult?.data || [];

  // Start with featured items from settings
  let featuredItems = (settings.featured_items || []).slice(0, 5);

  // Enrich ALL microgrant items with fresh image URLs from grant_cycles
  const micrograntItems = featuredItems.filter((item: any) => item.type === "microgrant");

  if (micrograntItems.length > 0) {
    const grantIds = micrograntItems.map((item: any) => item.id.replace("grant_", ""));
    const { data: grantCycles } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, featured_image")
      .in("id", grantIds);

    if (grantCycles && grantCycles.length > 0) {
      const grantImageMap = new Map(grantCycles.map(g => [g.id, g.featured_image]));
      featuredItems = featuredItems.map((item: any) => {
        if (item.type === "microgrant") {
          const grantId = item.id.replace("grant_", "");
          return { ...item, image: grantImageMap.get(grantId) || "" };
        }
        return item;
      });
    }
  }

  return (
    <main className="min-h-screen">
      <AccessPerksSync userId={user.id} />

      <DashboardHero heroImage={settings.hero_image_url || "/images/landing.jpg"} />

      <div className="grid md:grid-cols-4 gap-0 mb-0">
        <div className="col-span-1 bg-nfw-dove p-6">
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

        <div className="col-span-3 bg-nfw-aubergine p-6">
          <MembershipImpactCard
            totalSavings={savings.total}
            micrograntsSavings={savings.microgrants}
            perksSavings={savings.perks}
            zeroDollarStoreSavings={savings.zeroDollarStore}
          />
        </div>
      </div>

      <PopularAcrossNFW featuredItems={featuredItems} />

      <DashboardPerksSection likedStores={likedStores} />

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
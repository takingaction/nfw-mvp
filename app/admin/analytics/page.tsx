import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const AdminAnalyticsClient = dynamic(
  () => import("@/components/admin/AdminAnalyticsClient"),
  {
    loading: () => (
      <div className="h-96 bg-gray-100 rounded animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    ),
  }
);

async function AdminAnalyticsContent() {
  await requireAdmin();
  const supabase = await createClient();

  // Members data - fetch ALL via pagination to bypass 1000 row limit
  const pageSize = 1000;
  const allProfiles: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, joined_at, subscription_status, membership_level, subscription_ends_at, first_paid_at, first_paid_level, is_approved_free_member, free_membership_contact_submitted, state, city, household_income, date_of_birth, is_admin, profile_completed, previous_membership_level, stripe_customer_id, lifetime_value, signup_source",
      )
      .order("joined_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching profiles:", error);
      break;
    }

    if (data && data.length > 0) {
      allProfiles.push(...data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const profiles = allProfiles;

  // Membership payments for period revenue calculation
  const { data: membershipPayments } = await supabaseAdmin
    .from("membership_payments")
    .select("id, user_id, amount, payment_type, created_at")
    .order("created_at", { ascending: true });

  // Membership upgrades for upgrade stats
  const { data: membershipUpgrades } = await supabaseAdmin
    .from("membership_upgrades")
    .select("id, user_id, from_level, to_level, amount, created_at")
    .order("created_at", { ascending: true });

  // Grants data (use admin client to bypass RLS)
  const { data: grants } = await supabaseAdmin
    .from("grants")
    .select(
      "id, cycle_id, status, amount_approved, submitted_at, funded_at",
    )
    .order("submitted_at", { ascending: true });

  // Grant cycles data (use admin client to bypass RLS)
  const { data: grantCycles } = await supabaseAdmin
    .from("grant_cycles")
    .select("id, start_date, end_date, is_testing_only")
    .order("start_date", { ascending: true });

  // Perks redemptions (use admin client to bypass RLS)
  const { data: redemptions } = await supabaseAdmin
    .from("offer_redemptions")
    .select("id, user_id, offer_key, offer_title, store_name, redeem_type, created_at")
    .order("created_at", { ascending: true });

  // Newsletter signups (use admin client to bypass RLS)
  const { data: newsletterEmails } = await supabaseAdmin
    .from("coming_soon_emails")
    .select("id, created_at")
    .order("created_at", { ascending: true });

  // Zero Dollar Store claims (use admin client to bypass RLS)
  const { data: zdsClaims } = await supabaseAdmin
    .from("zero_dollar_claims")
    .select("id, user_id, shopify_product_id, status, claimed_at")
    .order("claimed_at", { ascending: true });

  // NFW Perk Redemptions for engagement (use admin client to bypass RLS)
  const { data: nfwPerkRedemptions } = await supabaseAdmin
    .from("nfw_perk_redemptions")
    .select("id, user_id, perk_id, redeemed_at")
    .order("redeemed_at", { ascending: true });

  // Shopify product mappings for product titles
  const { data: shopifyProducts } = await supabaseAdmin
    .from("shopify_product_mappings")
    .select("shopify_product_id, title")
    .not("title", "is", null);

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-nfw-blackberry">Analytics</h1>
          <p className="text-nfw-blackberry/60 text-lg">
            Member, grant, and perks performance data
          </p>
        </div>

        <div className="mb-6 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-nfw-aubergine"></div>
            <span className="text-nfw-blackberry/70">Fixed (all time)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-nfw-wisteria"></div>
            <span className="text-nfw-blackberry/70">Changes with date range</span>
          </div>
        </div>

        <AdminAnalyticsClient
          profiles={profiles || []}
          grants={grants || []}
          grantCycles={grantCycles || []}
          redemptions={redemptions || []}
          newsletterEmails={newsletterEmails || []}
          zdsClaims={zdsClaims || []}
          shopifyProducts={shopifyProducts || []}
          nfwPerkRedemptions={nfwPerkRedemptions || []}
          membershipPayments={membershipPayments || []}
          membershipUpgrades={membershipUpgrades || []}
        />
      </div>
    </main>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 bg-nfw-dove">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-10 bg-nfw-stone/20 w-1/3 mb-4"></div>
            <div className="h-6 bg-nfw-stone/20 w-2/3 mb-8"></div>
            <div className="h-96 bg-nfw-stone/20"></div>
          </div>
        </main>
      }
    >
      <AdminAnalyticsContent />
    </Suspense>
  );
}

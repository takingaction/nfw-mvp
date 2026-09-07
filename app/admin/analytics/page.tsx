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

const PAGE_SIZE = 1000;

async function fetchAllWithPagination(
  tableName: string,
  queryBuilder: any,
  orderColumn: string = "created_at"
): Promise<any[]> {
  const allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const { data, error } = await queryBuilder
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`[analytics] Error fetching ${tableName}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      page++;
      hasMore = data.length === PAGE_SIZE;
      console.log(`[analytics] ${tableName}: fetched page ${page} (${data.length} rows), total so far: ${allData.length}`);
    } else {
      hasMore = false;
    }
  }

  console.log(`[analytics] ${tableName}: complete. Total rows: ${allData.length}`);
  return allData;
}

async function AdminAnalyticsContent() {
  await requireAdmin({ redirectOnFailure: true });
  const supabase = await createClient();

  // ── PROFILES ────────────────────────────────────────────────────────────────
  console.log("[analytics] Starting profile fetch with pagination...");
  const profilesQuery = supabase
    .from("profiles")
    .select(
      "id, joined_at, subscription_status, membership_level, subscription_ends_at, first_paid_at, first_paid_level, is_approved_free_member, free_membership_contact_submitted, state, city, household_income, date_of_birth, is_admin, profile_completed, previous_membership_level, stripe_customer_id, signup_source"
    );
  const profiles = await fetchAllWithPagination("profiles", profilesQuery, "joined_at");

  // ── MEMBERSHIP PAYMENTS ────────────────────────────────────────────────────
  console.log("[analytics] Starting membership_payments fetch...");
  const membershipPaymentsQuery = supabaseAdmin
    .from("membership_payments")
    .select("id, user_id, amount, payment_type, created_at");
  const membershipPayments = await fetchAllWithPagination("membership_payments", membershipPaymentsQuery);

  // ── MEMBERSHIP UPGRADES ──────────────────────────────────────────────────
  console.log("[analytics] Starting membership_upgrades fetch...");
  const membershipUpgradesQuery = supabaseAdmin
    .from("membership_upgrades")
    .select("id, user_id, from_level, to_level, amount, created_at");
  const membershipUpgrades = await fetchAllWithPagination("membership_upgrades", membershipUpgradesQuery);

  // ── GRANTS ───────────────────────────────────────────────────────────────
  console.log("[analytics] Starting grants fetch...");
  const grantsQuery = supabaseAdmin
    .from("grants")
    .select("id, user_id, cycle_id, status, amount_approved, submitted_at, funded_at");
  const grants = await fetchAllWithPagination("grants", grantsQuery, "submitted_at");

  // ── GRANT CYCLES ────────────────────────────────────────────────────────
  console.log("[analytics] Starting grant_cycles fetch (no pagination needed)...");
  const { data: grantCycles } = await supabaseAdmin
    .from("grant_cycles")
    .select("id, start_date, end_date, is_testing_only")
    .order("start_date", { ascending: true });
  console.log(`[analytics] grant_cycles: ${grantCycles?.length || 0} rows`);

  // ── OFFER REDEMPTIONS ───────────────────────────────────────────────────
  console.log("[analytics] Starting offer_redemptions fetch...");
  const redemptionsQuery = supabaseAdmin
    .from("offer_redemptions")
    .select("id, user_id, offer_key, offer_title, store_name, redeem_type, created_at");
  const redemptions = await fetchAllWithPagination("offer_redemptions", redemptionsQuery);

  // ── NEWSLETTER SIGNUPS ─────────────────────────────────────────────────
  console.log("[analytics] Starting coming_soon_emails fetch (no pagination needed)...");
  const { data: newsletterEmails } = await supabaseAdmin
    .from("coming_soon_emails")
    .select("id, created_at")
    .order("created_at", { ascending: true });
  console.log(`[analytics] coming_soon_emails: ${newsletterEmails?.length || 0} rows`);

  // ── ZERO DOLLAR STORE CLAIMS ─────────────────────────────────────────────
  console.log("[analytics] Starting zero_dollar_claims fetch...");
  const zdsClaimsQuery = supabaseAdmin
    .from("zero_dollar_claims")
    .select("id, user_id, shopify_product_id, status, claimed_at");
  const zdsClaims = await fetchAllWithPagination("zero_dollar_claims", zdsClaimsQuery, "claimed_at");

  // ── NFW PERK REDEMPTIONS ───────────────────────────────────────────────
  console.log("[analytics] Starting nfw_perk_redemptions fetch...");
  const nfwPerkRedemptionsQuery = supabaseAdmin
    .from("nfw_perk_redemptions")
    .select("id, user_id, perk_id, redeemed_at");
  const nfwPerkRedemptions = await fetchAllWithPagination("nfw_perk_redemptions", nfwPerkRedemptionsQuery, "redeemed_at");

  // ── SHOPIFY PRODUCTS ────────────────────────────────────────────────────
  console.log("[analytics] Starting shopify_product_mappings fetch (no pagination needed)...");
  const { data: shopifyProducts } = await supabaseAdmin
    .from("shopify_product_mappings")
    .select("shopify_product_id, title")
    .not("title", "is", null);
  console.log(`[analytics] shopify_product_mappings: ${shopifyProducts?.length || 0} rows`);

  console.log("[analytics] All data fetching complete.");

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

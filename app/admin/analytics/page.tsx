import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { packAnalyticsDataset } from "@/lib/analytics-dataset";

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

/**
 * Fetch every row of a table, 1000 rows per request (PostgREST's max).
 * `buildQuery` must return a fresh query builder each call: supabase-js
 * builders are mutable, so reusing one would stack .order() params per page.
 */
type AnalyticsRow = Record<string, unknown>;

async function fetchAllWithPagination(
  tableName: string,
  // supabase-js's builder types don't survive being passed around generically.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: () => any,
  orderColumn: string = "created_at"
): Promise<AnalyticsRow[]> {
  const allData: AnalyticsRow[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    // Tiebreak on id: orderColumn (e.g. created_at) isn't unique, and ties
    // straddling a page boundary can repeat or drop rows.
    const { data, error } = await buildQuery()
      .order(orderColumn, { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      // Throw rather than return a partial table: partial data would show
      // as real (too-low) numbers with no sign anything went wrong.
      console.error(`[analytics] Error fetching ${tableName}:`, error);
      throw new Error(`Failed to load ${tableName} for analytics`);
    }
    if (!data || data.length === 0) break;

    allData.push(...data);
    page++;
    if (data.length < PAGE_SIZE) break;
  }

  return allData;
}

async function AdminAnalyticsContent() {
  await requireAdmin({ redirectOnFailure: true });
  const startedAt = Date.now();

  // All reads use the service-role client. requireAdmin() above is the access
  // check; reading profiles through the member session made RLS run
  // is_admin() on every row, which cost ~0.7-1s per 1000-row page (~25 pages).
  // Tables are fetched in parallel rather than one after another.
  const [
    profiles,
    membershipPayments,
    membershipUpgrades,
    waitlistAcceptances,
    grants,
    grantCyclesResult,
    redemptions,
    newsletterEmails,
    zdsClaims,
    nfwPerkRedemptions,
    shopifyProductsResult,
  ] = await Promise.all([
    fetchAllWithPagination(
      "profiles",
      () =>
        supabaseAdmin
          .from("profiles")
          .select(
            // email is read only to flag the test accounts; it is not sent to the browser.
            "id, email, joined_at, subscription_status, membership_level, subscription_ends_at, first_paid_at, first_paid_level, is_approved_free_member, free_membership_contact_submitted, state, is_admin, profile_completed, previous_membership_level"
          ),
      "joined_at",
    ),
    fetchAllWithPagination("membership_payments", () =>
      supabaseAdmin.from("membership_payments").select("id, amount, created_at"),
    ),
    fetchAllWithPagination("membership_upgrades", () =>
      supabaseAdmin.from("membership_upgrades").select("id, user_id, from_level, to_level, amount, created_at"),
    ),
    // used_at = when the member clicked the approval link (waitlist → free).
    // Display-only: shown as the "Upgraded" date in the waitlist → free list.
    fetchAllWithPagination("waitlist_acceptance_tokens", () =>
      supabaseAdmin
        .from("waitlist_acceptance_tokens")
        .select("id, user_id, used_at, created_at")
        .not("used_at", "is", null),
    ),
    fetchAllWithPagination(
      "grants",
      () =>
        supabaseAdmin
          .from("grants")
          .select("id, user_id, cycle_id, status, amount_approved, submitted_at, funded_at"),
      "submitted_at",
    ),
    supabaseAdmin
      .from("grant_cycles")
      .select("id, start_date, end_date, is_testing_only")
      .order("start_date", { ascending: true }),
    fetchAllWithPagination("offer_redemptions", () =>
      supabaseAdmin
        .from("offer_redemptions")
        .select("id, user_id, offer_key, offer_title, store_name, redeem_type, created_at"),
    ),
    fetchAllWithPagination("coming_soon_emails", () =>
      supabaseAdmin.from("coming_soon_emails").select("id, created_at"),
    ),
    fetchAllWithPagination(
      "zero_dollar_claims",
      () => supabaseAdmin.from("zero_dollar_claims").select("id, user_id, shopify_product_id, status, claimed_at"),
      "claimed_at",
    ),
    fetchAllWithPagination(
      "nfw_perk_redemptions",
      () => supabaseAdmin.from("nfw_perk_redemptions").select("id, user_id, redeemed_at"),
      "redeemed_at",
    ),
    supabaseAdmin
      .from("shopify_product_mappings")
      .select("shopify_product_id, title")
      .not("title", "is", null),
  ]);

  if (grantCyclesResult.error) {
    // Without cycles, test-cycle grants can't be excluded from every number.
    console.error("[analytics] Error fetching grant_cycles:", grantCyclesResult.error);
    throw new Error("Failed to load grant_cycles for analytics");
  }
  if (shopifyProductsResult.error) {
    console.error("[analytics] Error fetching shopify_product_mappings:", shopifyProductsResult.error);
  }
  const grantCycles = grantCyclesResult.data;
  const shopifyProducts = shopifyProductsResult.data;

  const dataset = packAnalyticsDataset({
    profiles,
    membershipPayments,
    membershipUpgrades,
    waitlistAcceptances,
    grants,
    grantCycles: grantCycles || [],
    redemptions,
    newsletterEmails,
    zdsClaims,
    nfwPerkRedemptions,
    shopifyProducts: shopifyProducts || [],
  });

  console.log(
    `[analytics] Loaded ${profiles.length} profiles, ${grants.length} grants, ${redemptions.length} redemptions, ` +
      `${membershipPayments.length} payments in ${Date.now() - startedAt}ms`,
  );


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

        <AdminAnalyticsClient dataset={dataset} />
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

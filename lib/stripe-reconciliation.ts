import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { StripeSubRecord, StripeTier } from "@/lib/stripe-member-reconciliation";

/** Row id of the per-subscription snapshot in stripe_subscriptions_cache. */
export const SUBSCRIPTION_SNAPSHOT_ID = "latest";

/**
 * Shared logic for refreshing the "Stripe Live" reconciliation cache.
 *
 * Used by:
 *  - GET /api/admin/backfill/stripe/reconcile?fresh=true  (the aubergine "Refresh" button)
 *  - GET /api/cron/refresh-reconciliation                  (every 10 minutes)
 *
 * Pages through Stripe subscriptions (customers expanded in the same call),
 * tallies active contributing ($15) vs founding ($100) into the latest
 * completed `reconciliation_jobs` row with job_type='stripe_live' (read by
 * /admin/backfill/stripe and /admin/analytics), and stores a per-subscription
 * snapshot in stripe_subscriptions_cache for the member-by-member comparison.
 */

export interface StripeLiveTier {
  count: number;
  true_total: number;
  total: number;
}

export interface StripeLiveData {
  contributing: StripeLiveTier;
  founding: StripeLiveTier;
  total: StripeLiveTier;
  fetchedAt: string;
}

const STRIPE_PAGE_DELAY_MS = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return stripeClient;
}

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Tier from a subscription's first price. "other" = neither known price. */
function subscriptionTier(sub: Stripe.Subscription): StripeTier {
  const price = sub.items?.data?.[0]?.price;
  const amount = price?.unit_amount ?? 0;
  if (amount === 10000 || price?.id === process.env.STRIPE_PRICE_FOUNDING) return "founding";
  if (amount === 1500 || price?.id === process.env.STRIPE_PRICE_CONTRIBUTING) return "contributing";
  return "other";
}

// Statuses fetched for the member-by-member comparison. incomplete_expired
// (abandoned checkouts) is left out: it never meant a membership.
const SNAPSHOT_STATUSES: Stripe.SubscriptionListParams.Status[] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "paused",
];

/**
 * Fetch subscriptions from Stripe, compute tier totals, and write them to the
 * stripe_live cache row. Also writes a per-subscription snapshot to
 * stripe_subscriptions_cache (id 'latest') for the member-by-member
 * comparison on /admin/backfill/stripe. Returns the tier totals.
 */
export async function refreshStripeLiveCache(): Promise<StripeLiveData> {
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  // Customers are expanded in the list call: subscriptions don't carry an
  // email, and the old approach (one customers.retrieve per subscription,
  // ~7,000 calls) ran past the cron's time limit.
  const snapshot: StripeSubRecord[] = [];
  const activeSubs: Stripe.Subscription[] = [];
  const stripeEmailMap = new Map<string, "contributing" | "founding">(); // first occurrence wins
  let apiCalls = 0;
  let deletedOrNoEmail = 0;

  for (const status of SNAPSHOT_STATUSES) {
    let startingAfter: string | undefined;
    for (;;) {
      const params: Stripe.SubscriptionListParams = { limit: 100, status, expand: ["data.customer"] };
      if (startingAfter) params.starting_after = startingAfter;
      const response = await stripe.subscriptions.list(params);
      apiCalls++;

      for (const sub of response.data) {
        const customer = sub.customer;
        const customerId = typeof customer === "string" ? customer : customer.id;
        const email =
          typeof customer !== "string" && !("deleted" in customer && customer.deleted) && customer.email
            ? customer.email.toLowerCase()
            : null;
        if (!email) deletedOrNoEmail++;
        const tier = subscriptionTier(sub);

        snapshot.push({
          id: sub.id,
          customer: customerId,
          email,
          status: sub.status,
          tier,
          amount: sub.items?.data?.[0]?.price?.unit_amount ?? null,
          cancelScheduled: !!sub.cancel_at_period_end || sub.cancel_at != null,
          created: sub.created,
          endedAt: sub.ended_at ?? null,
        });

        if (sub.status === "active") {
          activeSubs.push(sub);
          // Legacy tally: anything not founding counts as contributing.
          if (email && !stripeEmailMap.has(email)) {
            stripeEmailMap.set(email, tier === "founding" ? "founding" : "contributing");
          }
        }
      }

      if (!response.has_more || response.data.length === 0) break;
      startingAfter = response.data[response.data.length - 1].id;
      await sleep(STRIPE_PAGE_DELAY_MS);
    }
  }

  // Calculate totals (active subscriptions, as before)
  let contributingCount = 0;
  let contributingTotal = 0;
  let foundingCount = 0;
  let foundingTotal = 0;

  for (const sub of activeSubs) {
    if (subscriptionTier(sub) === "founding") {
      foundingCount++;
      foundingTotal += 100;
    } else {
      contributingCount++;
      contributingTotal += 15;
    }
  }

  const fetchedAt = new Date().toISOString();
  const { error: snapshotError } = await supabaseAdmin.from("stripe_subscriptions_cache").upsert({
    id: SUBSCRIPTION_SNAPSHOT_ID,
    subscriptions_json: snapshot,
    fetched_at: fetchedAt,
    subscription_count: snapshot.length,
    api_calls: apiCalls,
    incomplete: false,
    warning: deletedOrNoEmail > 0 ? `${deletedOrNoEmail} subscriptions have a deleted customer or no email` : null,
  });
  if (snapshotError) throw new Error(`Failed to write subscription snapshot: ${snapshotError.message}`);

  // "In Stripe, No Profile" — fetch all contributing/founding profile emails
  // (paginated past 1000), then diff against the Stripe email set.
  const profileEmails = new Set<string>();
  let profilePage = 0;
  const profilePageSize = 1000;
  let profileHasMore = true;
  while (profileHasMore) {
    const from = profilePage * profilePageSize;
    const { data: profileBatch, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("membership_level", ["contributing", "founding"])
      .not("email", "is", null)
      .range(from, from + profilePageSize - 1);
    if (profileError) {
      throw new Error(`Failed to load profile emails: ${profileError.message}`);
    }
    for (const p of profileBatch || []) {
      if (p.email) profileEmails.add(p.email.toLowerCase());
    }
    if (!profileBatch || profileBatch.length < profilePageSize) {
      profileHasMore = false;
    } else {
      profilePage++;
    }
  }

  const missingFromDb: string[] = [];
  for (const email of stripeEmailMap.keys()) {
    if (!profileEmails.has(email)) missingFromDb.push(email);
  }
  missingFromDb.sort();

  const stripeLiveData: StripeLiveData = {
    contributing: { count: contributingCount, true_total: contributingTotal, total: contributingTotal },
    founding: { count: foundingCount, true_total: foundingTotal, total: foundingTotal },
    total: {
      count: contributingCount + foundingCount,
      true_total: contributingTotal + foundingTotal,
      total: contributingTotal + foundingTotal,
    },
    fetchedAt,
  };

  // Update/create cache entry (latest completed stripe_live job row)
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  const { data: existingCache } = await supabaseAdmin
    .from("reconciliation_jobs")
    .select("id")
    .eq("job_type", "stripe_live")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingCache) {
    const { error } = await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "completed",
        progress: "Completed",
        completed_at: now,
        stripe_live_json: stripeLiveData,
        missing_from_db: missingFromDb,
        expires_at: expiresAt,
      })
      .eq("id", existingCache.id);
    if (error) throw new Error(`Failed to update stripe_live cache: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin.from("reconciliation_jobs").insert({
      job_type: "stripe_live",
      status: "completed",
      progress: "Completed",
      completed_at: now,
      stripe_live_json: stripeLiveData,
      missing_from_db: missingFromDb,
      expires_at: expiresAt,
    });
    if (error) throw new Error(`Failed to insert stripe_live cache: ${error.message}`);
  }

  return stripeLiveData;
}

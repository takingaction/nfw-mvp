import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Shared logic for refreshing the "Stripe Live" reconciliation cache.
 *
 * Used by:
 *  - GET /api/admin/backfill/stripe/reconcile?fresh=true  (the aubergine "Refresh" button)
 *  - GET /api/cron/refresh-reconciliation                  (every 10 minutes)
 *
 * Pages through all active Stripe subscriptions, tallies contributing ($15) vs
 * founding ($100), and upserts the result into the latest completed
 * `reconciliation_jobs` row with job_type='stripe_live'. That row is the cache
 * that /admin/backfill/stripe and /admin/analytics read from.
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
const CUSTOMER_LOOKUP_DELAY_MS = 50;
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

/**
 * Fetch all active subscriptions from Stripe, compute tier totals, and write
 * them to the stripe_live cache row. Returns the computed data.
 */
export async function refreshStripeLiveCache(): Promise<StripeLiveData> {
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  // Fetch all active subscriptions directly from Stripe. While we iterate, also
  // collect a per-email tier map so we can compute "In Stripe, No Profile" once
  // the page-loop finishes. Stripe doesn't put email on the subscription object,
  // so any sub without `billing_details.email` requires a customer lookup
  // (~70% of subs trigger this — adds ~40s for 2,700 active subs).
  const subscriptions: Stripe.Subscription[] = [];
  const stripeEmailMap = new Map<string, "contributing" | "founding">(); // first occurrence wins
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Stripe.SubscriptionListParams = { limit: 100, status: "active" };
    if (startingAfter) params.starting_after = startingAfter;

    const response = await stripe.subscriptions.list(params);
    subscriptions.push(...response.data);

    for (const sub of response.data) {
      const item = sub.items?.data?.[0];
      const priceAmount = item?.price?.unit_amount || 0;
      const isFounding =
        priceAmount === 10000 ||
        item?.price?.id === process.env.STRIPE_PRICE_FOUNDING ||
        (priceAmount === 100 && item?.price?.recurring?.interval === "year");
      const tier: "contributing" | "founding" = isFounding ? "founding" : "contributing";

      // Resolve email from the subscription first, then the customer.
      const subAny = sub as any;
      let email: string = subAny.billing_details?.email || "";
      if (!email) {
        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        if (customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted && customer.email) {
              email = customer.email;
            }
          } catch {
            // Customer lookup failed; leave email empty.
          }
          await sleep(CUSTOMER_LOOKUP_DELAY_MS);
        }
      }
      if (email) {
        const lower = email.toLowerCase();
        if (!stripeEmailMap.has(lower)) {
          stripeEmailMap.set(lower, tier);
        }
      }
    }

    hasMore = response.has_more;
    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
    await sleep(STRIPE_PAGE_DELAY_MS);
  }

  // Calculate totals
  let contributingCount = 0;
  let contributingTotal = 0;
  let foundingCount = 0;
  let foundingTotal = 0;

  for (const sub of subscriptions) {
    const item = sub.items?.data?.[0];
    const priceId = item?.price?.id;
    const priceAmount = item?.price?.unit_amount || 0;

    const isFounding =
      priceAmount === 10000 ||
      priceId === process.env.STRIPE_PRICE_FOUNDING ||
      (priceAmount === 100 && item?.price?.recurring?.interval === "year");

    if (isFounding) {
      foundingCount++;
      foundingTotal += 100;
    } else {
      contributingCount++;
      contributingTotal += 15;
    }
  }

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
    fetchedAt: new Date().toISOString(),
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

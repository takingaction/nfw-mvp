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

  // Fetch all active subscriptions directly from Stripe
  const subscriptions: Stripe.Subscription[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: Stripe.SubscriptionListParams = { limit: 100, status: "active" };
    if (startingAfter) params.starting_after = startingAfter;

    const response = await stripe.subscriptions.list(params);
    subscriptions.push(...response.data);

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
    .single();

  if (existingCache) {
    const { error } = await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "completed",
        progress: "Completed",
        completed_at: now,
        stripe_live_json: stripeLiveData,
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
      expires_at: expiresAt,
    });
    if (error) throw new Error(`Failed to insert stripe_live cache: ${error.message}`);
  }

  return stripeLiveData;
}

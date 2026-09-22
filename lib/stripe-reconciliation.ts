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
const CUSTOMER_LOOKUP_BATCH_SIZE = 25; // concurrency cap per batch; well under Stripe's 100 req/sec
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
  // the page-loop finishes.
  //
  // Email resolution: Stripe subscriptions don't carry email directly. When
  // billing_details.email is missing we batch-look-up the customer
  // asynchronously after pagination completes. Sequential lookups cost
  // ~200s for ~1,890 calls (~70% of 2,700 active subs at 50ms each) which
  // exceeds Vercel's 120s ceiling on refresh-reconciliation. Batching in
  // chunks of 25 brings this to ~15s of Stripe API time while staying under
  // the 100 req/sec rate limit.
  const subscriptions: Stripe.Subscription[] = [];
  const stripeEmailMap = new Map<string, "contributing" | "founding">(); // first occurrence wins
  const subsNeedingEmailLookup: { customerId: string; tier: "contributing" | "founding" }[] = [];

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

      const subAny = sub as any;
      const billingEmail: string = subAny.billing_details?.email || "";
      if (billingEmail) {
        const lower = billingEmail.toLowerCase();
        if (!stripeEmailMap.has(lower)) {
          stripeEmailMap.set(lower, tier);
        }
        continue;
      }

      // Email missing from subscription — schedule a customer lookup for the
      // post-pagination batch loop.
      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        subsNeedingEmailLookup.push({ customerId, tier });
      }
    }

    hasMore = response.has_more;
    if (hasMore && response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
    await sleep(STRIPE_PAGE_DELAY_MS);
  }

  // Batched customer lookups. Promise.allSettled keeps every successful
  // lookup even if individual calls fail (transient Stripe 5xx, rate
  // limits, etc.) — matches the previous try/catch-and-continue semantics.
  console.log(
    `[refreshStripeLiveCache] Batched lookups for ${subsNeedingEmailLookup.length} customers in chunks of ${CUSTOMER_LOOKUP_BATCH_SIZE}`,
  );
  for (let i = 0; i < subsNeedingEmailLookup.length; i += CUSTOMER_LOOKUP_BATCH_SIZE) {
    const batch = subsNeedingEmailLookup.slice(i, i + CUSTOMER_LOOKUP_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((entry) => stripe.customers.retrieve(entry.customerId)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status !== "fulfilled") continue;
      const customer = r.value;
      if (customer.deleted || !customer.email) continue;
      const lower = customer.email.toLowerCase();
      if (!stripeEmailMap.has(lower)) {
        // First-occurrence tier wins; if a customer has multiple subs across
        // tiers (rare), the first sub we encountered determines the tier.
        stripeEmailMap.set(lower, batch[j].tier);
      }
    }
    if (i + CUSTOMER_LOOKUP_BATCH_SIZE < subsNeedingEmailLookup.length) {
      await sleep(CUSTOMER_LOOKUP_DELAY_MS);
    }
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

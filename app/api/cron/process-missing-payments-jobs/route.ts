import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Worker settings
const BATCH_SIZE = 25;       // concurrent Stripe customer lookups per batch
const BATCH_DELAY_MS = 100;  // delay between batches (Stripe-friendly)

// Self-imposed budget — leave 50s under maxDuration so the cron can finish
// cleanly before Vercel kills it.
const TIME_BUDGET_MS = 250_000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pick up one pending job, compute the Stripe-vs-DB diff for active
 * contributing/founding subscriptions, write the result back to the
 * job row.
 *
 * Active-only is intentional: only `active` subscriptions can have
 * generated the $15 / $100 invoices tracked by membership_payments.
 * The previous synchronous route looped 8 statuses and ran per-sub
 * setTimeout(25) sleeps — that added ~540s of dead idle time on the
 * 2,700+ sub dataset and was the cause of the FUNCTION_INVOCATION_TIMEOUT.
 */
async function processJob(jobId: string, startedAt: number): Promise<void> {
  console.log(`[process-missing-payments] Starting job ${jobId}`);

  // Mark processing (atomic guard so two crons don't double-pick)
  const { data: claimed } = await supabaseAdmin
    .from("missing_payments_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    console.log(`[process-missing-payments] Job ${jobId} was already claimed`);
    return;
  }

  try {
    // ----- Step 1: Load paid emails from DB -----
    const paidProfileEmails = new Set<string>();
    let dbContributingCount = 0;
    let dbFoundingCount = 0;

    let paidPage = 0;
    const paidPageSize = 1000;
    let paidHasMore = true;

    while (paidHasMore) {
      const { data: paidBatch, error: paidError } = await supabaseAdmin
        .from("membership_payments")
        .select(`
          amount,
          profiles(email)
        `)
        .in("amount", [15, 100])
        .range(paidPage * paidPageSize, (paidPage + 1) * paidPageSize - 1);

      if (paidError) {
        throw new Error(`Failed to load paid profiles: ${paidError.message}`);
      }

      if (paidBatch && paidBatch.length > 0) {
        for (const row of paidBatch) {
          const email = (row.profiles as any)?.email?.toLowerCase().trim();
          if (email) paidProfileEmails.add(email);
          if (row.amount === 15) dbContributingCount++;
          else if (row.amount === 100) dbFoundingCount++;
        }
        paidPage++;
        paidHasMore = paidBatch.length === paidPageSize;
      } else {
        paidHasMore = false;
      }
    }

    console.log(
      `[process-missing-payments] Loaded ${paidProfileEmails.size} unique paid emails (${dbContributingCount} $15 / ${dbFoundingCount} $100)`
    );

    // ----- Step 2: Page active Stripe subscriptions, capture customer info -----
    const stripeEmailsByTier = {
      contributing: new Set<string>(),
      founding: new Set<string>(),
    };
    const stripeCustomerInfo = {
      contributing: new Map<string, { name: string; customer_id: string }>(),
      founding: new Map<string, { name: string; customer_id: string }>(),
    };

    let stripeHasMore = true;
    let stripeCursor: string | undefined;
    let stripeSubsTotal = 0;
    let stripeSubsProcessed = 0;

    while (stripeHasMore) {
      // Check time budget before each page
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        console.log(
          `[process-missing-payments] Time budget reached after ${stripeSubsTotal} subs; partial result`
        );
        break;
      }

      const params: any = { limit: 100, status: "active" };
      if (stripeCursor) params.starting_after = stripeCursor;

      const response = await stripe.subscriptions.list(params);
      stripeHasMore = response.has_more;
      stripeSubsTotal += response.data.length;

      if (response.data.length > 0) {
        stripeCursor = response.data[response.data.length - 1].id;
      }

      // Filter to $15 / $100 subscriptions first
      const matchingSubs = response.data.filter((sub: any) => {
        const priceAmount = sub.items?.data?.[0]?.price?.unit_amount;
        return priceAmount === 1500 || priceAmount === 10000;
      });

      // Collect subs that need a customer lookup (no inline email)
      const lookupTargets: { sub: any; tier: "contributing" | "founding" }[] = [];
      for (const sub of matchingSubs) {
        const priceAmount = sub.items.data[0].price.unit_amount;
        const tier = priceAmount === 1500 ? "contributing" : "founding";
        const subAny = sub as any;
        if (subAny.billing_details?.email) {
          // Has email inline — record immediately
          const emailLower = subAny.billing_details.email.toLowerCase().trim();
          stripeEmailsByTier[tier].add(emailLower);
          stripeCustomerInfo[tier].set(emailLower, {
            name: subAny.billing_details.name || "",
            customer_id: sub.customer as string,
          });
          stripeSubsProcessed++;
        } else {
          lookupTargets.push({ sub, tier });
        }
      }

      // Concurrent customer lookups in batches of BATCH_SIZE
      for (let i = 0; i < lookupTargets.length; i += BATCH_SIZE) {
        if (Date.now() - startedAt > TIME_BUDGET_MS) break;

        const chunk = lookupTargets.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          chunk.map(async ({ sub, tier }) => {
            try {
              const customer = (await stripe.customers.retrieve(
                sub.customer as string
              )) as Stripe.Customer;
              if (!customer.deleted && customer.email) {
                return {
                  tier,
                  email: customer.email.toLowerCase().trim(),
                  name: customer.name || "",
                  customer_id: sub.customer as string,
                };
              }
            } catch {
              // Customer deleted or inaccessible; skip
            }
            return null;
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            stripeEmailsByTier[r.value.tier].add(r.value.email);
            stripeCustomerInfo[r.value.tier].set(r.value.email, {
              name: r.value.name,
              customer_id: r.value.customer_id,
            });
          }
          stripeSubsProcessed++;
        }

        // Throttle between batches (Stripe-friendly)
        if (i + BATCH_SIZE < lookupTargets.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    }

    // ----- Step 3: Load profiles for profile_id lookup (paginated) -----
    const profileIdByEmail = new Map<string, string>();
    let profPage = 0;
    const profPageSize = 1000;
    let profHasMore = true;

    while (profHasMore) {
      const { data: profBatch } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .range(profPage * profPageSize, (profPage + 1) * profPageSize - 1);

      if (profBatch && profBatch.length > 0) {
        for (const p of profBatch) {
          if (p.email) {
            profileIdByEmail.set(p.email.toLowerCase().trim(), p.id);
          }
        }
        profPage++;
        profHasMore = profBatch.length === profPageSize;
      } else {
        profHasMore = false;
      }
    }

    // ----- Step 4: Build missing lists -----
    const missingContributing: any[] = [];
    for (const email of stripeEmailsByTier.contributing) {
      if (!paidProfileEmails.has(email)) {
        const info = stripeCustomerInfo.contributing.get(email)!;
        missingContributing.push({
          email,
          name: info.name,
          stripe_customer_id: info.customer_id,
          amount: 15,
          profile_id: profileIdByEmail.get(email) || null,
          subscription_id: null,
          interval: "year",
          current_period_start: null,
          status: "active",
          backfill_status: null,
        });
      }
    }

    const missingFounding: any[] = [];
    for (const email of stripeEmailsByTier.founding) {
      if (!paidProfileEmails.has(email)) {
        const info = stripeCustomerInfo.founding.get(email)!;
        missingFounding.push({
          email,
          name: info.name,
          stripe_customer_id: info.customer_id,
          amount: 100,
          profile_id: profileIdByEmail.get(email) || null,
          subscription_id: null,
          interval: "year",
          current_period_start: null,
          status: "active",
          backfill_status: null,
        });
      }
    }

    missingContributing.sort((a, b) => a.email.localeCompare(b.email));
    missingFounding.sort((a, b) => a.email.localeCompare(b.email));

    const elapsedMs = Date.now() - startedAt;
    const completedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const budgetReached = Date.now() - startedAt >= TIME_BUDGET_MS;

    const summary = {
      contributing_count: missingContributing.length,
      founding_count: missingFounding.length,
      total_count: missingContributing.length + missingFounding.length,
      stripe_contributing: stripeEmailsByTier.contributing.size,
      stripe_founding: stripeEmailsByTier.founding.size,
      db_contributing: dbContributingCount,
      db_founding: dbFoundingCount,
      paid_emails_count: paidProfileEmails.size,
    };

    await supabaseAdmin
      .from("missing_payments_jobs")
      .update({
        status: "completed",
        stripe_subscriptions_total: stripeSubsTotal,
        stripe_subscriptions_processed: stripeSubsProcessed,
        missing_contributing_count: missingContributing.length,
        missing_founding_count: missingFounding.length,
        contributing_json: missingContributing,
        founding_json: missingFounding,
        summary_json: summary,
        elapsed_ms: elapsedMs,
        error_message: budgetReached
          ? `Partial: 250s time budget reached. Processed ${stripeSubsProcessed} of ${stripeSubsTotal} subs. Click Refresh to continue.`
          : null,
        completed_at: completedAt,
        expires_at: expiresAt,
      })
      .eq("id", jobId);

    console.log(
      `[process-missing-payments] Job ${jobId} completed in ${elapsedMs}ms. ` +
      `contributing=${missingContributing.length} founding=${missingFounding.length} ` +
      `subsTotal=${stripeSubsTotal} subsProcessed=${stripeSubsProcessed}` +
      (budgetReached ? " [PARTIAL]" : "")
    );
  } catch (error: any) {
    console.error(`[process-missing-payments] Job ${jobId} failed:`, error);
    await supabaseAdmin
      .from("missing_payments_jobs")
      .update({
        status: "failed",
        error_message: error.message || "Unknown error",
        elapsed_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-missing-payments] Starting worker...");

    // Mark any stale processing jobs as failed (older than 15 minutes)
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("missing_payments_jobs")
      .update({
        status: "failed",
        error_message: "Stale: previous run did not complete within 15 minutes",
        completed_at: new Date().toISOString(),
      })
      .eq("status", "processing")
      .lt("started_at", staleThreshold);

    // Pick the oldest pending job
    const { data: job } = await supabaseAdmin
      .from("missing_payments_jobs")
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!job) {
      console.log("[process-missing-payments] No pending jobs found");
      return NextResponse.json({ success: true, processed: "no_job" });
    }

    await processJob(job.id, Date.now());

    return NextResponse.json({ success: true, processed: "job_handled" });
  } catch (error: any) {
    console.error("[process-missing-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process missing-payments jobs" },
      { status: 500 }
    );
  }
}

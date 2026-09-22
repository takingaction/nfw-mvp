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
// Vercel Pro default is 60 s, which is too tight for the subscription
// enumeration + ~810 customer-email lookups for missing_from_db. 300 s
// matches the other job workers (process-stripe-only-jobs,
// process-missing-payments-jobs).
export const maxDuration = 300;

const DELAY_MS = 100; // Delay between Stripe API calls

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process stripe_live job - fetch all Stripe subscriptions, calculate totals,
// and populate the "In Stripe, No Profile" set so the cache row carries both
// stripe_live_json AND missing_from_db (matching what refreshStripeLiveCache
// writes for the 10-min cron path and the manual Refresh button).
async function processStripeLiveJob(jobId: string): Promise<void> {
  console.log(`[process-reconciliation] Processing stripe_live job ${jobId}`);

  try {
    // Update job status to processing
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "processing",
        progress: "Fetching Stripe subscriptions..."
      })
      .eq("id", jobId);

    // Fetch all active subscriptions
    const subscriptions: any[] = [];
    const stripeEmailMap = new Map<string, "contributing" | "founding">(); // first occurrence wins
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: any = { limit: 100, status: "active" };
      if (startingAfter) params.starting_after = startingAfter;

      const response = await stripe.subscriptions.list(params);
      subscriptions.push(...response.data);

      // Resolve each sub's email for the missing_from_db set.
      for (const sub of response.data) {
        const item = sub.items?.data?.[0];
        const priceAmount = item?.price?.unit_amount || 0;
        const isFounding =
          priceAmount === 10000 ||
          item?.price?.id === process.env.STRIPE_PRICE_FOUNDING ||
          (priceAmount === 100 && item?.price?.recurring?.interval === "year");
        const tier: "contributing" | "founding" = isFounding ? "founding" : "contributing";

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
            await sleep(50);
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

      await sleep(DELAY_MS);
    }

    console.log(`[process-reconciliation] Found ${subscriptions.length} active subscriptions`);

    // Calculate totals by tier
    let contributingCount = 0;
    let contributingTotal = 0;
    let foundingCount = 0;
    let foundingTotal = 0;

    for (const sub of subscriptions) {
      const priceId = sub.items?.data?.[0]?.price?.id;
      const priceAmount = sub.items?.data?.[0]?.price?.unit_amount || 0;

      // Determine tier based on price
      // $15/month = contributing, $100/year or $100/month = founding
      // Or check if it's the founding price env var
      const isFounding = priceAmount === 10000 ||
        priceId === process.env.STRIPE_PRICE_FOUNDING ||
        (priceAmount === 100 && sub.items?.data?.[0]?.price?.recurring?.interval === 'year');

      if (isFounding) {
        foundingCount++;
        foundingTotal += 100; // Founding is $100
      } else {
        contributingCount++;
        contributingTotal += 15; // Contributing is $15
      }
    }

    // Fetch all profile emails (paginated past 1000) so we can compute the
    // "In Stripe, No Profile" set. Same logic as refreshStripeLiveCache.
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

    const stripeLiveData = {
      contributing: { count: contributingCount, true_total: contributingTotal },
      founding: { count: foundingCount, true_total: foundingTotal },
      total: { count: contributingCount + foundingCount, true_total: contributingTotal + foundingTotal },
      fetchedAt: new Date().toISOString(),
    };

    // Update job with results — stripe_live_json AND missing_from_db so the
    // 'In Stripe, No Profile' card populates from this path too.
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "completed",
        progress: "Completed",
        completed_at: new Date().toISOString(),
        stripe_live_json: stripeLiveData,
        missing_from_db: missingFromDb,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour cache
      })
      .eq("id", jobId);

    console.log(
      `[process-reconciliation] stripe_live job ${jobId} completed:`,
      stripeLiveData,
      `missing_from_db=${missingFromDb.length}`,
    );

  } catch (error: any) {
    console.error(`[process-reconciliation] Error processing stripe_live job ${jobId}:`, error);
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "failed",
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

// Process payment_verify job - verify payments in our DB against Stripe
async function processPaymentVerifyJob(jobId: string): Promise<void> {
  console.log(`[process-reconciliation] Processing payment_verify job ${jobId}`);

  try {
    // Update job status to processing
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "processing",
        progress: "Fetching payment data..."
      })
      .eq("id", jobId);

    // Get all membership payments from our DB
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("membership_payments")
      .select("id, amount, stripe_payment_id, stripe_invoice_id, user_id, payment_type, created_at")
      .in("amount", [15, 100]);

    if (paymentsError) {
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    console.log(`[process-reconciliation] Verifying ${payments?.length || 0} payments`);

    let valid = 0;
    let refunded = 0;
    let failed = 0;
    let notFound = 0;
    const problematicPayments: any[] = [];

    // Verify each payment against Stripe
    for (const payment of payments || []) {
      try {
        let stripeStatus: string | null = null;
        let isValid = false;

        if (payment.stripe_invoice_id?.startsWith("in_")) {
          // Invoice ID - verify via invoices API
          await sleep(DELAY_MS);
          try {
            const invoice = await stripe.invoices.retrieve(payment.stripe_invoice_id);
            stripeStatus = invoice.status;
            isValid = invoice.status === "paid";
          } catch (e: any) {
            if (e.code === "resource_missing") {
              stripeStatus = "not_found";
              notFound++;
              problematicPayments.push({
                id: payment.id,
                stripe_payment_id: payment.stripe_payment_id,
                amount: payment.amount,
                email: null, // Would need to join to get email
                user_id: payment.user_id,
                created_at: payment.created_at,
                issue: "not_found",
                stripe_status: null,
              });
            }
          }
        } else if (payment.stripe_payment_id?.startsWith("ch_")) {
          // Charge ID - verify via charges API
          await sleep(DELAY_MS);
          try {
            const charge = await stripe.charges.retrieve(payment.stripe_payment_id);
            stripeStatus = charge.status;
            isValid = charge.status === "succeeded";
          } catch (e: any) {
            if (e.code === "resource_missing") {
              stripeStatus = "not_found";
              notFound++;
              problematicPayments.push({
                id: payment.id,
                stripe_payment_id: payment.stripe_payment_id,
                amount: payment.amount,
                email: null,
                user_id: payment.user_id,
                created_at: payment.created_at,
                issue: "not_found",
                stripe_status: null,
              });
            }
          }
        }

        if (isValid) valid++;
        else if (stripeStatus === "refunded") {
          refunded++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: null,
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "refunded",
            stripe_status: stripeStatus,
          });
        }
        else if (stripeStatus === "failed") {
          failed++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: null,
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "failed",
            stripe_status: stripeStatus,
          });
        }

      } catch (e: any) {
        console.error(`[process-reconciliation] Error verifying payment ${payment.id}:`, e.message);
      }
    }

    const verifiedData = {
      valid,
      refunded,
      failed,
      not_found: notFound,
    };

    // Update job with results
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "completed",
        progress: "Completed",
        completed_at: new Date().toISOString(),
        verified_payments_json: verifiedData,
        problematic_payments_json: problematicPayments,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour cache
      })
      .eq("id", jobId);

    console.log(`[process-reconciliation] payment_verify job ${jobId} completed:`, verifiedData);

  } catch (error: any) {
    console.error(`[process-reconciliation] Error processing payment_verify job ${jobId}:`, error);
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "failed",
        error: error.message,
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

    console.log("[process-reconciliation] Starting reconciliation jobs processor...");

    // Mark stale processing rows as failed (15-minute threshold). Mirrors
    // process-missing-payments-jobs:339-348 to prevent orphan rows from
    // blocking the cron indefinitely. Must run before the SELECT queries
    // below — otherwise a stuck `processing` row gates every cron tick via
    // the in-flight guard in refresh-reconciliation/route.ts.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: "Stale: previous run did not complete within 15 minutes",
      })
      .in("job_type", ["stripe_live", "payment_verify"])
      .eq("status", "processing")
      .lt("created_at", fifteenMinutesAgo);

    // Process stripe_live jobs first
    const { data: stripeLiveJob } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("id")
      .eq("job_type", "stripe_live")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (stripeLiveJob) {
      await processStripeLiveJob(stripeLiveJob.id);
    }

    // Process payment_verify jobs
    const { data: paymentVerifyJob } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("id")
      .eq("job_type", "payment_verify")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (paymentVerifyJob) {
      await processPaymentVerifyJob(paymentVerifyJob.id);
    }

    if (!stripeLiveJob && !paymentVerifyJob) {
      console.log("[process-reconciliation] No pending jobs found");
    }

    return NextResponse.json({
      success: true,
      processed: {
        stripe_live: stripeLiveJob ? "job_found_and_processed" : "no_job",
        payment_verify: paymentVerifyJob ? "job_found_and_processed" : "no_job",
      }
    });

  } catch (error: any) {
    console.error("[process-reconciliation] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process reconciliation jobs" },
      { status: 500 }
    );
  }
}

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

const DELAY_MS = 100; // Delay between Stripe API calls

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process stripe_live job - fetch all Stripe subscriptions and calculate totals
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
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: any = { limit: 100, status: "active" };
      if (startingAfter) params.starting_after = startingAfter;

      const response = await stripe.subscriptions.list(params);
      subscriptions.push(...response.data);

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

    const stripeLiveData = {
      contributing: { count: contributingCount, true_total: contributingTotal },
      founding: { count: foundingCount, true_total: foundingTotal },
      total: { count: contributingCount + foundingCount, true_total: contributingTotal + foundingTotal },
      fetchedAt: new Date().toISOString(),
    };

    // Update job with results
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({
        status: "completed",
        progress: "Completed",
        completed_at: new Date().toISOString(),
        stripe_live_json: stripeLiveData,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour cache
      })
      .eq("id", jobId);

    console.log(`[process-reconciliation] stripe_live job ${jobId} completed:`, stripeLiveData);

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

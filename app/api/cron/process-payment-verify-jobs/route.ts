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

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

const DELAY_MS = 25; // Rate limiting delay between Stripe API calls

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get("Authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pick up one pending payment_verify job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("*")
      .eq("job_type", "payment_verify")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      // No pending jobs - check for stale processing jobs
      const { data: staleJob } = await supabaseAdmin
        .from("reconciliation_jobs")
        .select("*")
        .eq("job_type", "payment_verify")
        .eq("status", "processing")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (staleJob) {
        const processingTime = Date.now() - new Date(staleJob.created_at).getTime();
        if (processingTime > 10 * 60 * 1000) {
          await supabaseAdmin
            .from("reconciliation_jobs")
            .update({ status: "failed", error: "Job timed out", completed_at: new Date().toISOString() })
            .eq("id", staleJob.id);
          return NextResponse.json({ message: "Marked stale job as failed" });
        }
        return NextResponse.json({ message: "Job still processing", jobId: staleJob.id });
      }

      return NextResponse.json({ message: "No pending payment_verify jobs" });
    }

    // Mark job as processing
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({ status: "processing", progress: "Fetching payments from database..." })
      .eq("id", job.id);

    try {
      // Step 1: Get all payments from membership_payments
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from("membership_payments")
        .select(`
          id,
          amount,
          stripe_payment_id,
          stripe_invoice_id,
          created_at,
          user_id,
          profiles!inner(email, full_name)
        `)
        .in("amount", [15, 100]);

      if (paymentsError) {
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }

      // Step 2: Verify each payment against Stripe
      const verifiedCount = { valid: 0, refunded: 0, failed: 0, not_found: 0 };
      const problematicPayments: any[] = [];

      let processed = 0;
      const total = (payments || []).length;

      await supabaseAdmin
        .from("reconciliation_jobs")
        .update({ progress: `Verifying ${total} payments...` })
        .eq("id", job.id);

      for (const payment of payments || []) {
        processed++;
        
        // Progress update every 50 payments
        if (processed % 50 === 0) {
          await supabaseAdmin
            .from("reconciliation_jobs")
            .update({ progress: `Verifying payments... ${processed}/${total}` })
            .eq("id", job.id);
        }

        // stripe_payment_id can be null for automatic payments
        const hasStripeId = !!payment.stripe_payment_id;
        const hasInvoiceId = !!payment.stripe_invoice_id;

        if (!hasStripeId && !hasInvoiceId) {
          // Missing both Stripe IDs - can't verify
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: null,
            stripe_invoice_id: null,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "missing_stripe_id",
            stripe_status: null,
          });
          continue;
        }

        try {
          const paymentId = payment.stripe_payment_id || payment.stripe_invoice_id;
          let status: string | null = null;

          if (paymentId?.startsWith("in_")) {
            // Invoice ID - use invoices API
            const invoice = await stripe.invoices.retrieve(paymentId);
            status = invoice.status === "paid" ? "succeeded" : invoice.status;
          } else if (paymentId?.startsWith("ch_")) {
            // Charge ID - use charges API
            const charge = await stripe.charges.retrieve(paymentId);
            status = charge.status;
          } else {
            // Unknown format - can't verify
            verifiedCount.not_found++;
            problematicPayments.push({
              id: payment.id,
              stripe_payment_id: payment.stripe_payment_id,
              amount: payment.amount,
              email: (payment.profiles as any)?.email || "unknown",
              user_id: payment.user_id,
              created_at: payment.created_at,
              issue: "unknown_id_format",
              stripe_status: null,
            });
            await delay(DELAY_MS);
            continue;
          }

          if (status === "succeeded") {
            verifiedCount.valid++;
          } else if (status === "refunded") {
            verifiedCount.refunded++;
            problematicPayments.push({
              id: payment.id,
              stripe_payment_id: payment.stripe_payment_id,
              amount: payment.amount,
              email: (payment.profiles as any)?.email || "unknown",
              user_id: payment.user_id,
              created_at: payment.created_at,
              issue: "refunded",
              stripe_status: "refunded",
            });
          } else if (status === "failed") {
            verifiedCount.failed++;
            problematicPayments.push({
              id: payment.id,
              stripe_payment_id: payment.stripe_payment_id,
              amount: payment.amount,
              email: (payment.profiles as any)?.email || "unknown",
              user_id: payment.user_id,
              created_at: payment.created_at,
              issue: "failed",
              stripe_status: "failed",
            });
          } else {
            // Any other status
            verifiedCount.not_found++;
            problematicPayments.push({
              id: payment.id,
              stripe_payment_id: payment.stripe_payment_id,
              amount: payment.amount,
              email: (payment.profiles as any)?.email || "unknown",
              user_id: payment.user_id,
              created_at: payment.created_at,
              issue: status || "unknown",
              stripe_status: status,
            });
          }
        } catch (stripeError: any) {
          // Payment not found in Stripe
          verifiedCount.not_found++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "not_found",
            stripe_status: null,
          });
        }

        // Rate limit - be nice to Stripe
        await delay(DELAY_MS);
      }

      // Update job with results
      await supabaseAdmin
        .from("reconciliation_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          verified_payments_json: verifiedCount,
          problematic_payments_json: problematicPayments,
          progress: `Complete: ${verifiedCount.valid} valid, ${verifiedCount.refunded} refunded, ${verifiedCount.failed} failed, ${verifiedCount.not_found} not found`,
        })
        .eq("id", job.id);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: `Verified ${total} payments: ${JSON.stringify(verifiedCount)}`,
      });

    } catch (error: any) {
      await supabaseAdmin
        .from("reconciliation_jobs")
        .update({
          status: "failed",
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[process-payment-verify-jobs] Error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
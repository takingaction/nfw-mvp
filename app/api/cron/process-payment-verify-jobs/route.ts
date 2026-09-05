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

const DELAY_MS = 50;

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
      // Check for stale processing jobs
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
        if (processingTime > 15 * 60 * 1000) {
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
      .update({ status: "processing", progress: "Fetching payments..." })
      .eq("id", job.id);

    try {
      // Get all membership payments
      const { data: allPayments } = await supabaseAdmin
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
        .in("amount", [15, 100])
        .limit(10000);

      if (!allPayments) {
        throw new Error("Failed to fetch payments");
      }

      // Verify each payment against Stripe
      const problematicPayments: any[] = [];
      const verifiedCount = { valid: 0, refunded: 0, failed: 0, not_found: 0 };

      let processed = 0;
      const total = allPayments.length;

      for (const payment of allPayments) {
        processed++;
        if (processed % 10 === 0) {
          await supabaseAdmin
            .from("reconciliation_jobs")
            .update({ progress: `Verifying payments... ${processed}/${total}` })
            .eq("id", job.id);
        }

        const hasStripeId = !!payment.stripe_payment_id;
        const hasInvoiceId = !!payment.stripe_invoice_id;

        if (!hasStripeId && !hasInvoiceId) {
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
            const invoice = await stripe.invoices.retrieve(paymentId);
            status = invoice.status === "paid" ? "succeeded" : invoice.status;
          } else if (paymentId?.startsWith("ch_")) {
            const charge = await stripe.charges.retrieve(paymentId);
            status = charge.status;
          } else {
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

        await delay(DELAY_MS);
      }

      // Update job with results
      await supabaseAdmin
        .from("reconciliation_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          verified_payments_json: { verified: verifiedCount },
          problematic_payments_json: problematicPayments,
          progress: "Complete",
        })
        .eq("id", job.id);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: `Verified ${total} payments, ${problematicPayments.length} problematic`,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

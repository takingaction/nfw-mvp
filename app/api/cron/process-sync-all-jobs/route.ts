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

// Concurrency settings
const CONCURRENCY = 25;       // 25 customers concurrently
const BATCH_DELAY_MS = 200;    // 200ms between batches

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface PaymentRecord {
  id: string;
  amount: number;
  status: string | null;
  date: string;
  error_message: string | null;
  billing_reason: string | null;
  stripe_invoice_id: string;
  stripe_payment_id: string | null;
  payment_type: string;
}

// Sync payments for a single customer from Stripe
async function syncPaymentsForCustomer(
  stripeCustomerId: string
): Promise<{
  payment_count: number;
  total_amount: number;
  has_failed: boolean;
  has_refunded: boolean;
  latest_payment_date: string | null;
  latest_payment_status: string | null;
  latest_payment_amount: number | null;
  latest_payment_error: string | null;
  all_payments_json: PaymentRecord[];
} | null> {
  try {
    const invoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: { customer: string; limit: number; starting_after?: string } = {
        customer: stripeCustomerId,
        limit: 100,
      };
      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const response = await stripe.invoices.list(params);
      invoices.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }

      await sleep(25);
    }

    const allPayments: PaymentRecord[] = [];
    let totalAmount = 0;
    let hasFailed = false;
    let hasRefunded = false;
    let latestSucceededPayment: { date: string; amount: number; status: string; payment_type: string } | null = null;

    for (const invoice of invoices) {
      const amount = invoice.amount_paid / 100;
      const status = invoice.status;
      const date = new Date(invoice.created * 1000).toISOString();

      let errorMessage: string | null = null;
      if (status === "open" && invoice.next_payment_attempt) {
        errorMessage = "Payment attempt failed, retry scheduled";
        hasFailed = true;
      }

      const paymentType = invoice.billing_reason === "subscription_create" ? "signup" :
                         invoice.billing_reason === "subscription_cycle" ? "renewal" :
                         invoice.billing_reason === "subscription_update" ? "upgrade" : "renewal";

      if (status === "paid") {
        totalAmount += amount;
        if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
          latestSucceededPayment = { date, amount, status, payment_type: paymentType };
        }
      }

      const chargeId = (invoice as any).charge;
      const stripePaymentId = typeof chargeId === 'string' ? chargeId : null;

      allPayments.push({
        id: invoice.id,
        amount,
        status,
        date,
        error_message: errorMessage,
        billing_reason: invoice.billing_reason,
        stripe_invoice_id: invoice.id,
        stripe_payment_id: stripePaymentId,
        payment_type: paymentType,
      });
    }

    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      payment_count: allPayments.length,
      total_amount: totalAmount,
      has_failed: hasFailed,
      has_refunded: hasRefunded,
      latest_payment_date: latestSucceededPayment?.date || null,
      latest_payment_status: latestSucceededPayment?.payment_type || null,
      latest_payment_amount: latestSucceededPayment?.amount || null,
      latest_payment_error: null,
      all_payments_json: allPayments,
    };
  } catch (error: any) {
    console.error(`[process-sync-all] Error for customer ${stripeCustomerId}:`, error.message);
    return null;
  }
}

function mapBillingReasonToPaymentType(billingReason: string | null): string {
  switch (billingReason) {
    case "subscription_create": return "signup";
    case "subscription_cycle": return "renewal";
    case "subscription_update": return "upgrade";
    default: return "renewal";
  }
}

async function insertMembershipPaymentsIfNeeded(
  profileId: string | null,
  allPaymentsJson: PaymentRecord[]
): Promise<{ inserted: number; skipped: number }> {
  if (!profileId) {
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const payment of allPaymentsJson) {
    if (payment.status !== "paid") {
      skipped++;
      continue;
    }

    const invoiceId = payment.stripe_invoice_id;
    if (!invoiceId) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .from("membership_payments")
      .select("id")
      .eq("stripe_invoice_id", invoiceId)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const paymentType = mapBillingReasonToPaymentType(payment.billing_reason);

    const { error: insertError } = await supabaseAdmin
      .from("membership_payments")
      .insert({
        user_id: profileId,
        amount: payment.amount,
        payment_type: paymentType,
        stripe_payment_id: payment.stripe_payment_id,
        stripe_invoice_id: invoiceId,
        created_at: payment.date,
      });

    if (insertError) {
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

async function updateJobProgress(
  jobId: string,
  processedRecords: number,
  totalRecords: number,
  syncedCount: number,
  failedCount: number
): Promise<void> {
  await supabaseAdmin
    .from("sync_all_jobs")
    .update({
      processed_records: processedRecords,
      synced_count: syncedCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function markJobComplete(
  jobId: string,
  status: "completed" | "failed",
  syncedCount: number,
  failedCount: number,
  errorMessage?: string
): Promise<void> {
  await supabaseAdmin
    .from("sync_all_jobs")
    .update({
      status,
      processed_records: syncedCount + failedCount,
      synced_count: syncedCount,
      failed_count: failedCount,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-sync-all] Starting sync-all jobs processor...");

    // First, mark any stale processing jobs as failed
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabaseAdmin
      .from("sync_all_jobs")
      .select("id")
      .eq("status", "processing")
      .lt("updated_at", tenMinutesAgo);

    if (staleJobs && staleJobs.length > 0) {
      console.log(`[process-sync-all] Marking ${staleJobs.length} stale jobs as failed`);
      for (const job of staleJobs) {
        await markJobComplete(job.id, "failed", 0, 0, "Job timed out");
      }
    }

    // Pick up oldest pending job
    const { data: job } = await supabaseAdmin
      .from("sync_all_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!job) {
      console.log("[process-sync-all] No pending jobs found, exiting");
      return NextResponse.json({ message: "No pending jobs" });
    }

    const jobId = job.id;
    console.log(`[process-sync-all] Processing job ${jobId}`);

    // Mark as processing
    await supabaseAdmin
      .from("sync_all_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // ========== STEP 1: Fix not_found records ==========
      console.log("[process-sync-all] Step 1: Fixing not_found records...");

      const PAGE_SIZE = 1000;
      const allNotFoundRows: { id: string; profile_id: string | null; email: string }[] = [];
      let notFoundPage = 0;
      let notFoundHasMore = true;

      while (notFoundHasMore) {
        const { data: notFoundBatch, error: notFoundError } = await supabaseAdmin
          .from("stripe_backfill_status")
          .select("id, profile_id, email")
          .eq("status", "not_found")
          .is("stripe_customer_id", null)
          .not("profile_id", "is", null)
          .range(notFoundPage * PAGE_SIZE, (notFoundPage + 1) * PAGE_SIZE - 1);

        if (notFoundError) {
          console.error("[process-sync-all] Error fetching not_found rows:", notFoundError);
          break;
        }

        if (notFoundBatch && notFoundBatch.length > 0) {
          allNotFoundRows.push(...notFoundBatch);
          notFoundPage++;
          notFoundHasMore = notFoundBatch.length === PAGE_SIZE;
        } else {
          notFoundHasMore = false;
        }
      }

      console.log(`[process-sync-all] Found ${allNotFoundRows.length} not_found records to fix`);

      let fixedCount = 0;
      for (const row of allNotFoundRows) {
        let stripeCustomerId: string | null = null;

        // First try lookup by profile_id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", row.profile_id)
          .single();

        if (profile?.stripe_customer_id) {
          stripeCustomerId = profile.stripe_customer_id;
        } else if (row.email) {
          // Fallback: try to find stripe_customer_id by email in Stripe
          try {
            const customers = await stripe.customers.list({ email: row.email, limit: 1 });
            if (customers.data.length > 0) {
              stripeCustomerId = customers.data[0].id;
            }
          } catch (stripeError: any) {
            console.warn(`[process-sync-all] Stripe lookup failed for ${row.email}:`, stripeError.message);
          }
        }

        if (stripeCustomerId) {
          const { error: updateError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .update({
              stripe_customer_id: stripeCustomerId,
              status: "matched",
              processed_at: new Date().toISOString(),
            })
            .eq("id", row.id);

          if (!updateError) {
            fixedCount++;
          }
        }
      }
      console.log(`[process-sync-all] Fixed ${fixedCount} not_found records`);

      // ========== STEP 2: Sync payments for matched rows ==========
      console.log("[process-sync-all] Step 2: Syncing payments...");

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: rows, error: rowsError } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("id, stripe_customer_id, profile_id, email, payment_sync_at")
        .eq("status", "matched")
        .not("stripe_customer_id", "is", null);

      if (rowsError) {
        throw new Error(`Error fetching rows: ${rowsError.message}`);
      }

      if (!rows || rows.length === 0) {
        console.log("[process-sync-all] No matched rows to sync");
        await markJobComplete(jobId, "completed", 0, 0);
        return NextResponse.json({ success: true, message: "No rows to sync" });
      }

      const rowsToSync = rows.filter(r =>
        !r.payment_sync_at || new Date(r.payment_sync_at) < new Date(twentyFourHoursAgo)
      );

      console.log(`[process-sync-all] ${rowsToSync.length} rows need syncing (of ${rows.length} total)`);

      // Update total_records in job
      await supabaseAdmin
        .from("sync_all_jobs")
        .update({ total_records: fixedCount + rowsToSync.length })
        .eq("id", jobId);

      // Process in concurrent batches
      for (let i = 0; i < rowsToSync.length; i += CONCURRENCY) {
        const batch = rowsToSync.slice(i, i + CONCURRENCY);

        const batchResults = await Promise.all(
          batch.map(async (row) => {
            if (!row.stripe_customer_id) {
              return { id: row.id, success: false, error: "No stripe_customer_id" };
            }

            if (row.stripe_customer_id.startsWith('acct_')) {
              return { id: row.id, success: true, skipped: true };
            }

            try {
              const paymentData = await syncPaymentsForCustomer(row.stripe_customer_id);

              if (!paymentData) {
                return { id: row.id, success: false, error: "Stripe API error" };
              }

              const { error: updateError } = await supabaseAdmin
                .from("stripe_backfill_status")
                .update({
                  payment_count: paymentData.payment_count,
                  total_amount: paymentData.total_amount,
                  has_failed: paymentData.has_failed,
                  has_refunded: paymentData.has_refunded,
                  latest_payment_date: paymentData.latest_payment_date,
                  latest_payment_status: paymentData.latest_payment_status,
                  latest_payment_amount: paymentData.latest_payment_amount,
                  latest_payment_error: paymentData.latest_payment_error,
                  all_payments_json: paymentData.all_payments_json,
                  payment_sync_at: new Date().toISOString(),
                  customer_processed_at: new Date().toISOString(),
                })
                .eq("id", row.id);

              if (updateError) {
                return { id: row.id, success: false, error: updateError.message };
              }

              const { inserted } = await insertMembershipPaymentsIfNeeded(
                row.profile_id,
                paymentData.all_payments_json
              );

              return { id: row.id, success: true, inserted };
            } catch (err: any) {
              return { id: row.id, success: false, error: err.message };
            }
          })
        );

        for (const r of batchResults) {
          if (r.success && !r.skipped) {
            syncedCount++;
          } else if (!r.success) {
            failedCount++;
            console.warn(`[process-sync-all] Failed to sync ${r.id}: ${r.error}`);
          }
        }

        // Update progress
        await updateJobProgress(jobId, i + batch.length, fixedCount + rowsToSync.length, syncedCount, failedCount);

        console.log(`[process-sync-all] Progress: ${Math.min(i + CONCURRENCY, rowsToSync.length)}/${rowsToSync.length}`);

        // Delay between batches to avoid rate limits
        if (i + CONCURRENCY < rowsToSync.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      console.log(`[process-sync-all] Complete: ${syncedCount} synced, ${failedCount} failed`);
      await markJobComplete(jobId, "completed", syncedCount, failedCount);

      return NextResponse.json({
        success: true,
        jobId,
        synced: syncedCount,
        failed: failedCount
      });

    } catch (error: any) {
      console.error("[process-sync-all] Job error:", error);
      await markJobComplete(jobId, "failed", syncedCount, failedCount, error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("[process-sync-all] Fatal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process jobs" },
      { status: 500 }
    );
  }
}

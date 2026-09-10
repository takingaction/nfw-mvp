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

// Chunked processing settings
const CUSTOMERS_PER_RUN = 50; // Process 50 customers per cron run (~60 seconds)
const DELAY_MS = 50;         // 50ms between Stripe calls

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
    let latestSucceededPayment: { date: string; amount: number; status: string; payment_type: string } | null = null;

    for (const invoice of invoices) {
      const amount = invoice.amount_paid / 100;
      const status = invoice.status;
      const date = new Date(invoice.created * 1000).toISOString();

      let errorMessage: string | null = null;
      if (status === "open" && invoice.next_payment_attempt) {
        errorMessage = "Payment attempt failed, retry scheduled";
      }

      const paymentType = mapBillingReasonToPaymentType(invoice.billing_reason);

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
      has_failed: false,
      has_refunded: false,
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

async function processJobChunk(jobId: string): Promise<{ done: boolean; phase: string }> {
  // Fetch current job state
  const { data: job } = await supabaseAdmin
    .from("sync_all_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) {
    throw new Error("Job not found");
  }

  const currentPhase = job.current_phase || "pending";
  const progressData = job.progress_data || {};
  const processedCount = job.processed_count || 0;

  console.log(`[process-sync-all] Phase: ${currentPhase}, Processed: ${processedCount}`);

  // ========== PHASE 1: Load profiles (one-time) ==========
  if (currentPhase === "pending" || !progressData.profileEmails) {
    console.log("[process-sync-all] PHASE 1: Loading profiles...");

    const allProfiles: { id: string; email: string }[] = [];
    let pageStart = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: profilesPage, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .range(pageStart, pageStart + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch profiles: ${error.message}`);
      }

      if (profilesPage && profilesPage.length > 0) {
        allProfiles.push(...profilesPage);
        pageStart += pageSize;
      }

      hasMore = profilesPage && profilesPage.length === pageSize;
    }

    // Build email set and map
    const profileEmails = new Set<string>();
    const profileEmailMap = new Map<string, string>(); // email -> id
    for (const profile of allProfiles) {
      if (profile.email) {
        const emailLower = profile.email.toLowerCase();
        profileEmails.add(emailLower);
        profileEmailMap.set(emailLower, profile.id);
      }
    }

    console.log(`[process-sync-all] Loaded ${allProfiles.length} profiles, ${profileEmails.size} emails`);

    // Move to phase 2
    await supabaseAdmin
      .from("sync_all_jobs")
      .update({
        current_phase: "load_backfill",
        progress_data: {
          profileEmails: Array.from(profileEmails),
          profileEmailMap: Array.from(profileEmailMap.entries()),
        },
        progress: "Loading backfill status...",
      })
      .eq("id", jobId);

    return { done: false, phase: "load_backfill" };
  }

  // ========== PHASE 2: Load backfill status rows ==========
  if (currentPhase === "load_backfill") {
    console.log("[process-sync-all] PHASE 2: Loading backfill status...");

    // Load all matched rows that need syncing
    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, stripe_customer_id, profile_id, email")
      .eq("status", "matched")
      .not("stripe_customer_id", "is", null);

    if (rowsError) {
      throw new Error(`Error fetching rows: ${rowsError.message}`);
    }

    if (!rows || rows.length === 0) {
      console.log("[process-sync-all] No matched rows to sync");
      await supabaseAdmin
        .from("sync_all_jobs")
        .update({
          status: "completed",
          current_phase: "completed",
          progress: "No rows to sync",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return { done: true, phase: "completed" };
    }

    const profileEmailMap = new Map<string, string>(progressData.profileEmailMap || []);
    const rowsToProcess = rows.filter(r => {
      // Filter out test accounts
      if (r.stripe_customer_id?.startsWith('acct_')) {
        return false;
      }
      return true;
    });

    console.log(`[process-sync-all] ${rowsToProcess.length} rows need syncing`);

    // Move to sync_missing phase
    await supabaseAdmin
      .from("sync_all_jobs")
      .update({
        current_phase: "sync_missing",
        progress_data: {
          ...progressData,
          rowsToProcess: rowsToProcess.map(r => ({
            id: r.id,
            stripe_customer_id: r.stripe_customer_id,
            profile_id: r.profile_id,
            email: r.email,
          })),
          fixedCount: 0,
        },
        processed_count: 0,
        total_count: rowsToProcess.length,
        progress: `Syncing ${rowsToProcess.length} customers...`,
      })
      .eq("id", jobId);

    return { done: false, phase: "sync_missing" };
  }

  // ========== PHASE 3: Sync payments for matched rows (chunked) ==========
  if (currentPhase === "sync_missing") {
    console.log("[process-sync-all] PHASE 3: Syncing payments...");
    
    const rowsToProcess = progressData.rowsToProcess || [];
    const fixedCount = progressData.fixedCount || 0;
    
    const startIndex = processedCount;
    const endIndex = Math.min(startIndex + CUSTOMERS_PER_RUN, rowsToProcess.length);
    
    console.log(`[process-sync-all] Processing customers ${startIndex} to ${endIndex} of ${rowsToProcess.length}`);

    let syncedCount = fixedCount;
    let failedCount = 0;
    let newFixedCount = fixedCount;

    for (let i = startIndex; i < endIndex; i++) {
      const row = rowsToProcess[i];
      
      if (i > startIndex) {
        await sleep(DELAY_MS);
      }

      try {
        const paymentData = await syncPaymentsForCustomer(row.stripe_customer_id);

        if (!paymentData) {
          failedCount++;
          continue;
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
          failedCount++;
          console.warn(`[process-sync-all] Failed to update ${row.id}: ${updateError.message}`);
          continue;
        }

        // Insert into membership_payments
        const { inserted } = await insertMembershipPaymentsIfNeeded(
          row.profile_id,
          paymentData.all_payments_json
        );

        syncedCount++;
        newFixedCount++;
      } catch (err: any) {
        failedCount++;
        console.warn(`[process-sync-all] Error syncing ${row.id}: ${err.message}`);
      }
    }

    const newProcessedCount = endIndex;
    const isDone = newProcessedCount >= rowsToProcess.length;

    if (isDone) {
      console.log(`[process-sync-all] Sync complete: ${newFixedCount} synced, ${failedCount} failed`);
      
      // Move to computing phase
      await supabaseAdmin
        .from("sync_all_jobs")
        .update({
          current_phase: "computing",
          progress_data: {
            ...progressData,
            rowsToProcess: [], // Clear to save space
            fixedCount: newFixedCount,
            failedCount,
          },
          processed_count: newProcessedCount,
          progress: "Computing results...",
        })
        .eq("id", jobId);

      return { done: false, phase: "computing" };
    } else {
      // Save checkpoint and let next cron run continue
      await supabaseAdmin
        .from("sync_all_jobs")
        .update({
          processed_count: newProcessedCount,
          progress_data: {
            ...progressData,
            rowsToProcess,
            fixedCount: newFixedCount,
          },
          progress: `Processed ${newProcessedCount}/${rowsToProcess.length}...`,
        })
        .eq("id", jobId);

      console.log(`[process-sync-all] Checkpoint saved at ${newProcessedCount}/${rowsToProcess.length}`);
      return { done: false, phase: "sync_missing" };
    }
  }

  // ========== PHASE 4: Computing (final summary) ==========
  if (currentPhase === "computing") {
    console.log("[process-sync-all] PHASE 4: Computing results...");

    // Get final counts from database
    const { data: stats } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("status, payment_count, total_amount");

    const matched = stats?.filter(s => s.status === "matched") || [];
    const totalSynced = matched.reduce((sum, s) => sum + (s.payment_count || 0), 0);
    const totalAmount = matched.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const failedCount = progressData.failedCount || 0;

    console.log(`[process-sync-all] Final: ${totalSynced} payments, $${totalAmount}`);

    await supabaseAdmin
      .from("sync_all_jobs")
      .update({
        status: "completed",
        current_phase: "completed",
        progress: `Completed: ${totalSynced} payments, $${totalAmount}`,
        completed_at: new Date().toISOString(),
        progress_data: null, // Clean up
      })
      .eq("id", jobId);

    console.log(`[process-sync-all] Job ${jobId} completed`);
    return { done: true, phase: "completed" };
  }

  return { done: true, phase: currentPhase };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-sync-all] Starting sync-all jobs processor...");

    // Mark stale processing jobs as failed (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabaseAdmin
      .from("sync_all_jobs")
      .select("id")
      .eq("status", "processing")
      .lt("updated_at", thirtyMinutesAgo);

    if (staleJobs && staleJobs.length > 0) {
      console.log(`[process-sync-all] Marking ${staleJobs.length} stale jobs as failed`);
      for (const stale of staleJobs) {
        await supabaseAdmin
          .from("sync_all_jobs")
          .update({
            status: "failed",
            error: "Job timed out",
            completed_at: new Date().toISOString(),
          })
          .eq("id", stale.id);
      }
    }

    // Find pending or processing job
    const { data: job } = await supabaseAdmin
      .from("sync_all_jobs")
      .select("id, status")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!job) {
      console.log("[process-sync-all] No pending jobs found");
      return NextResponse.json({ success: true, message: "No pending jobs" });
    }

    console.log(`[process-sync-all] Processing job ${job.id}`);

    // Ensure job is in processing state
    if (job.status === "pending") {
      await supabaseAdmin
        .from("sync_all_jobs")
        .update({ status: "processing" })
        .eq("id", job.id);
    }

    const result = await processJobChunk(job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      phase: result.phase,
      done: result.done,
    });

  } catch (error: any) {
    console.error("[process-sync-all] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process sync-all jobs" },
      { status: 500 }
    );
  }
}

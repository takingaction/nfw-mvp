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

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1000;

interface PaymentRecord {
  id: string;
  amount: number;
  status: string | null;
  date: string;
  error_message: string | null;
  billing_reason: string | null;
  stripe_invoice_id: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    // Fetch all invoices for this customer (invoices have billing_reason)
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
    let latestSucceededPayment: { date: string; amount: number; status: string } | null = null;

    for (const invoice of invoices) {
      const amount = invoice.amount_paid / 100;
      const status = invoice.status;
      const date = new Date(invoice.created * 1000).toISOString();

      let errorMessage: string | null = null;
      // Invoices with status "open" and a next_payment_attempt have failed payments
      if (status === "open" && invoice.next_payment_attempt) {
        errorMessage = "Payment attempt failed, retry scheduled";
        hasFailed = true;
      }

      // Note: Refund detection on invoices requires looking at related charges
      // For simplicity, we skip refund tracking on invoices

      if (status === "paid") {
        totalAmount += amount;
        if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
          latestSucceededPayment = { date, amount, status };
        }
      }

      allPayments.push({
        id: invoice.id,
        amount,
        status,
        date,
        error_message: errorMessage,
        billing_reason: invoice.billing_reason,
        stripe_invoice_id: invoice.id,
      });
    }

    allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      payment_count: allPayments.length,
      total_amount: totalAmount,
      has_failed: hasFailed,
      has_refunded: hasRefunded,
      latest_payment_date: latestSucceededPayment?.date || null,
      latest_payment_status: latestSucceededPayment?.status || null,
      latest_payment_amount: latestSucceededPayment?.amount || null,
      latest_payment_error: null,
      all_payments_json: allPayments,
    };
  } catch (error: any) {
    console.error(`[sync-all-stripe-payments] Error for customer ${stripeCustomerId}:`, error.message);
    return null;
  }
}

function mapBillingReasonToPaymentType(billingReason: string | null): string {
  switch (billingReason) {
    case "subscription_create":
      return "signup";
    case "subscription_cycle":
      return "renewal";
    case "subscription_update":
      return "upgrade";
    default:
      return "renewal"; // fallback for manual or unknown
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
    if (payment.status !== "succeeded") {
      skipped++;
      continue;
    }

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from("membership_payments")
      .select("id")
      .eq("stripe_payment_id", payment.id)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Determine payment type from billing_reason
    const paymentType = mapBillingReasonToPaymentType(payment.billing_reason);

    // Insert new record
    const { error: insertError } = await supabaseAdmin
      .from("membership_payments")
      .insert({
        user_id: profileId,
        amount: payment.amount,
        payment_type: paymentType,
        stripe_payment_id: payment.id,
        stripe_invoice_id: payment.stripe_invoice_id,
        created_at: payment.date,
      });

    if (insertError) {
      console.error(`[sync-all-stripe-payments] Failed to insert payment ${payment.id}:`, insertError.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Cron auth check
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[sync-all-stripe-payments] Starting full payment sync...");

    // Get all matched rows with stripe_customer_id that need syncing
    // Priority: rows never synced, then rows synced > 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, stripe_customer_id, profile_id, email, payment_sync_at")
      .eq("status", "matched")
      .not("stripe_customer_id", "is", null);

    if (rowsError) {
      console.error("[sync-all-stripe-payments] Error fetching rows:", rowsError);
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        message: "No matched rows with stripe_customer_id found",
      });
    }

    // Filter to rows that need syncing (never synced or > 24 hours old)
    const rowsToSync = rows.filter(r =>
      !r.payment_sync_at || new Date(r.payment_sync_at) < new Date(twentyFourHoursAgo)
    );

    console.log(`[sync-all-stripe-payments] ${rowsToSync.length} rows need syncing (of ${rows.length} total)`);

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < rowsToSync.length; i += BATCH_SIZE) {
      const batch = rowsToSync.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (row) => {
          if (!row.stripe_customer_id) {
            return { id: row.id, success: false, error: "No stripe_customer_id" };
          }

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
            console.error(`[sync-all-stripe-payments] Update error for ${row.id}:`, updateError);
            return { id: row.id, success: false, error: updateError.message };
          }

          // Insert succeeded payments into membership_payments if they don't exist
          const { inserted, skipped } = await insertMembershipPaymentsIfNeeded(
            row.profile_id,
            paymentData.all_payments_json
          );

          if (inserted > 0) {
            console.log(`[sync-all-stripe-payments] Inserted ${inserted} payments for customer ${row.id}`);
          }

          return { id: row.id, success: true, inserted, skipped };
        })
      );

      for (const r of batchResults) {
        if (r.success) {
          synced++;
        } else {
          failed++;
          if (r.error) {
            errors.push(`${r.id}: ${r.error}`);
          }
        }
      }

      console.log(`[sync-all-stripe-payments] Progress: ${Math.min(i + BATCH_SIZE, rowsToSync.length)}/${rowsToSync.length}`);

      if (i + BATCH_SIZE < rowsToSync.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`[sync-all-stripe-payments] Complete: ${synced} synced, ${failed} failed`);

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: rowsToSync.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });

  } catch (error: any) {
    console.error("[sync-all-stripe-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync payments" },
      { status: 500 }
    );
  }
}

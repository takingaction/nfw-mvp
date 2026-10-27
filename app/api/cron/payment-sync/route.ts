import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  getInvoicePaymentIds,
  mapBillingReasonToPaymentType,
  shouldRecordPayment,
} from "@/lib/stripe-payments";
import { fetchAllPages } from "@/lib/supabase-paginate";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 250;
// Re-check each matched customer at least this often. With ~3k members and
// ~2.5s per batch of 25, an hourly run clears well over the ~500 rows/hour
// this window needs.
const SYNC_WINDOW_HOURS = 6;
// Stop starting new batches after this, leaving headroom under maxDuration.
// Progress is persisted per row via payment_sync_at, so the next run resumes.
const TIME_BUDGET_MS = 250_000;
const PAGE_SIZE = 1000;

interface PaymentRecord {
  id: string;
  amount: number;
  status: string | null;
  date: string;
  error_message: string | null;
  billing_reason: string | null;
  stripe_invoice_id: string;
  stripe_payment_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_type: string;
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
      const params: Stripe.InvoiceListParams = {
        customer: stripeCustomerId,
        limit: 100,
        // Invoice.charge / Invoice.payment_intent were removed in API
        // 2025-03-31.basil; the payment now lives under `payments`.
        expand: ["data.payments"],
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
      // Skip $0 adjustment invoices — see shouldRecordPayment in
      // lib/stripe-payments.ts. Same rule as every other backfill route.
      if (!shouldRecordPayment(invoice)) {
        continue;
      }

      const amount = invoice.amount_paid / 100;
      const status = invoice.status;
      const date = new Date(invoice.created * 1000).toISOString();

      let errorMessage: string | null = null;
      if (status === "open" && invoice.next_payment_attempt) {
        errorMessage = "Payment attempt failed, retry scheduled";
        hasFailed = true;
      }

      const paymentType = mapBillingReasonToPaymentType(invoice.billing_reason);

      if (status === "paid") {
        totalAmount += amount;
        if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
          latestSucceededPayment = { date, amount, status, payment_type: paymentType };
        }
      }

      const { chargeId: stripePaymentId, paymentIntentId } = getInvoicePaymentIds(invoice);

      allPayments.push({
        id: invoice.id,
        amount,
        status,
        date,
        error_message: errorMessage,
        billing_reason: invoice.billing_reason,
        stripe_invoice_id: invoice.id,
        stripe_payment_id: stripePaymentId,
        stripe_payment_intent_id: paymentIntentId,
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
    console.error(`[payment-sync] Error for customer ${stripeCustomerId}:`, error.message);
    return null;
  }
}

// Local `mapBillingReasonToPaymentType` removed in favor of the shared
// helper at `@/lib/stripe-payments`.

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
    if (payment.status !== "paid" || payment.amount <= 0) {
      skipped++;
      continue;
    }

    const invoiceId = payment.stripe_invoice_id;

    if (!invoiceId) {
      console.warn(`[payment-sync] Skipping payment with no invoice ID for user ${profileId}`);
      skipped++;
      continue;
    }

    const { data: existing } = await supabaseAdmin
      .from("membership_payments")
      .select("id, stripe_payment_id, stripe_payment_intent_id")
      .eq("stripe_invoice_id", invoiceId)
      .is("original_payment_id", null)
      .limit(1);

    if (existing && existing.length > 0) {
      // Self-heal rows ingested before the basil fix: fill in the Stripe IDs
      // refund/dispute matching needs. Only fills nulls, never overwrites.
      const row = existing[0];
      const patch: { stripe_payment_id?: string; stripe_payment_intent_id?: string } = {};
      if (!row.stripe_payment_intent_id && payment.stripe_payment_intent_id) {
        patch.stripe_payment_intent_id = payment.stripe_payment_intent_id;
      }
      if (!row.stripe_payment_id && payment.stripe_payment_id) {
        patch.stripe_payment_id = payment.stripe_payment_id;
      }
      if (Object.keys(patch).length > 0) {
        const { error: patchError } = await supabaseAdmin
          .from("membership_payments")
          .update(patch)
          .eq("id", row.id);
        if (patchError) {
          console.error(`[payment-sync] Failed to backfill IDs on ${row.id}:`, patchError.message);
        }
      }
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
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        stripe_invoice_id: invoiceId,
        created_at: payment.date,
      });

    if (insertError) {
      console.error(`[payment-sync] Failed to insert payment ${invoiceId}:`, insertError.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function GET(request: Request): Promise<NextResponse> {
  // Budget is measured from the start of the request so Step 1 (not_found
  // repair) counts against it too.
  const startedAt = Date.now();
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[payment-sync] Starting hourly payment sync...");

    // Step 1: Fix not_found records that have stripe_customer_id on the profile
    console.log("[payment-sync] Step 1: Fixing not_found records with stripe_customer_id on profile...");

    const { data: notFoundRows, error: notFoundError } = await fetchAllPages((from, to) =>
      supabaseAdmin
        .from("stripe_backfill_status")
        .select("id, profile_id, email")
        .eq("status", "not_found")
        .is("stripe_customer_id", null)
        .order("id", { ascending: true })
        .range(from, to),
    );

    if (notFoundError) {
      console.error("[payment-sync] Error fetching not_found rows:", notFoundError);
    }

    let fixedCount = 0;
    if (notFoundRows && notFoundRows.length > 0) {
      console.log(`[payment-sync] Found ${notFoundRows.length} not_found records to fix`);

      // Look up profiles in batches, and only the ones that actually have a
      // stripe_customer_id. This used to be one request per not_found row
      // (~16k rows, almost none fixable) on every hourly run: ~180k profiles
      // requests a day, and it ate into the run's time budget for Step 2.
      const customerIdByProfile = new Map<string, string>();
      const profileIds = [...new Set(notFoundRows.map((r) => r.profile_id).filter(Boolean))] as string[];
      const LOOKUP_BATCH = 150; // keeps the id=in.(...) URL well under limits
      for (let i = 0; i < profileIds.length; i += LOOKUP_BATCH) {
        const { data: profiles, error: lookupError } = await supabaseAdmin
          .from("profiles")
          .select("id, stripe_customer_id")
          .in("id", profileIds.slice(i, i + LOOKUP_BATCH))
          .not("stripe_customer_id", "is", null);
        if (lookupError) {
          console.error("[payment-sync] Error looking up profiles for not_found rows:", lookupError.message);
          continue;
        }
        for (const p of profiles ?? []) {
          if (p.stripe_customer_id) customerIdByProfile.set(p.id, p.stripe_customer_id);
        }
      }

      for (const row of notFoundRows) {
        const stripeCustomerId = row.profile_id ? customerIdByProfile.get(row.profile_id) : undefined;
        const profile = stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : null;

        if (profile?.stripe_customer_id) {
          const { error: updateError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .update({
              stripe_customer_id: profile.stripe_customer_id,
              status: "matched",
              processed_at: new Date().toISOString(),
            })
            .eq("id", row.id);

          if (updateError) {
            console.error(`[payment-sync] Error fixing not_found row ${row.id}:`, updateError);
          } else {
            fixedCount++;
            console.log(`[payment-sync] Fixed not_found: ${row.email} -> ${profile.stripe_customer_id}`);
          }
        }
      }
      console.log(`[payment-sync] Fixed ${fixedCount} not_found records`);
    }

    // Step 2: Get matched rows that are due for a sync, stalest first.
    // Filtered in SQL and PAGINATED: PostgREST caps a single response at 1000
    // rows, and the previous unpaginated query silently only ever saw the
    // first 1000 of ~3k matched members, so the rest were never synced.
    const staleBefore = new Date(Date.now() - SYNC_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const rowsToSync: Array<{
      id: string;
      stripe_customer_id: string | null;
      profile_id: string | null;
      email: string | null;
      payment_sync_at: string | null;
    }> = [];

    for (let page = 0; ; page++) {
      const { data: pageRows, error: rowsError } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("id, stripe_customer_id, profile_id, email, payment_sync_at")
        .eq("status", "matched")
        .not("stripe_customer_id", "is", null)
        .or(`payment_sync_at.is.null,payment_sync_at.lt.${staleBefore}`)
        .order("payment_sync_at", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (rowsError) {
        console.error("[payment-sync] Error fetching rows:", rowsError);
        return NextResponse.json({ error: rowsError.message }, { status: 500 });
      }
      if (!pageRows || pageRows.length === 0) break;
      rowsToSync.push(...pageRows);
      if (pageRows.length < PAGE_SIZE) break;
    }

    if (rowsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        message: "All matched customers synced within the window",
      });
    }

    console.log(`[payment-sync] ${rowsToSync.length} rows due for sync (window ${SYNC_WINDOW_HOURS}h)`);
    let budgetReached = false;

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Rows that are skipped or fail still get payment_sync_at stamped, so a
    // permanently failing customer rotates to the back of the queue instead of
    // being retried first on every run and starving everyone else.
    const markAttempted = (id: string) =>
      supabaseAdmin
        .from("stripe_backfill_status")
        .update({ payment_sync_at: new Date().toISOString() })
        .eq("id", id);

    for (let i = 0; i < rowsToSync.length; i += BATCH_SIZE) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        budgetReached = true;
        console.log(`[payment-sync] Time budget reached at ${i}/${rowsToSync.length}; resuming next run`);
        break;
      }
      const batch = rowsToSync.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (row) => {
          if (!row.stripe_customer_id) {
            await markAttempted(row.id);
            return { id: row.id, success: false, error: "No stripe_customer_id" };
          }

          if (row.stripe_customer_id.startsWith('acct_')) {
            console.log(`[payment-sync] Skipping Connect account for ${row.email}: ${row.stripe_customer_id}`);
            await markAttempted(row.id);
            return { id: row.id, success: true, skipped: true, message: "Connect account - skipped" };
          }

          const paymentData = await syncPaymentsForCustomer(row.stripe_customer_id);

          if (!paymentData) {
            await markAttempted(row.id);
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
            console.error(`[payment-sync] Update error for ${row.id}:`, updateError);
            return { id: row.id, success: false, error: updateError.message };
          }

          const { inserted, skipped } = await insertMembershipPaymentsIfNeeded(
            row.profile_id,
            paymentData.all_payments_json
          );

          if (inserted > 0) {
            console.log(`[payment-sync] Inserted ${inserted} payments for customer ${row.id}`);
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

      console.log(`[payment-sync] Progress: ${Math.min(i + BATCH_SIZE, rowsToSync.length)}/${rowsToSync.length}`);

      if (i + BATCH_SIZE < rowsToSync.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(
      `[payment-sync] Complete: ${synced} synced, ${failed} failed, ${rowsToSync.length - synced - failed} deferred`,
    );

    return NextResponse.json({
      success: true,
      synced,
      failed,
      due: rowsToSync.length,
      deferred: rowsToSync.length - synced - failed,
      budgetReached,
      elapsedMs: Date.now() - startedAt,
      errors: errors.slice(0, 10),
    });

  } catch (error: any) {
    console.error("[payment-sync] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync payments" },
      { status: 500 }
    );
  }
}

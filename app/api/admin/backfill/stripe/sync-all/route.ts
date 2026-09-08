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
  stripe_payment_id: string | null;
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
    console.error(`[sync-all] Error for customer ${stripeCustomerId}:`, error.message);
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
      return "renewal";
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
      console.warn(`[sync-all] Skipping payment with no invoice ID for user ${profileId}`);
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
      console.error(`[sync-all] Failed to insert payment ${invoiceId}:`, insertError.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Admin auth check
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[sync-all] Starting payment sync (admin triggered)...");

    // Step 1: Fix not_found records that have stripe_customer_id on the profile
    console.log("[sync-all] Step 1: Fixing not_found records with stripe_customer_id on profile...");

    const { data: notFoundRows, error: notFoundError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, profile_id, email")
      .eq("status", "not_found")
      .is("stripe_customer_id", null);

    if (notFoundError) {
      console.error("[sync-all] Error fetching not_found rows:", notFoundError);
    }

    let fixedCount = 0;
    if (notFoundRows && notFoundRows.length > 0) {
      console.log(`[sync-all] Found ${notFoundRows.length} not_found records to fix`);

      for (const row of notFoundRows) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", row.profile_id)
          .single();

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
            console.error(`[sync-all] Error fixing not_found row ${row.id}:`, updateError);
          } else {
            fixedCount++;
            console.log(`[sync-all] Fixed not_found: ${row.email} -> ${profile.stripe_customer_id}`);
          }
        }
      }
      console.log(`[sync-all] Fixed ${fixedCount} not_found records`);
    }

    // Step 2: Get all matched rows with stripe_customer_id that need syncing
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, stripe_customer_id, profile_id, email, payment_sync_at")
      .eq("status", "matched")
      .not("stripe_customer_id", "is", null);

    if (rowsError) {
      console.error("[sync-all] Error fetching rows:", rowsError);
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

    const rowsToSync = rows.filter(r =>
      !r.payment_sync_at || new Date(r.payment_sync_at) < new Date(twentyFourHoursAgo)
    );

    console.log(`[sync-all] ${rowsToSync.length} rows need syncing (of ${rows.length} total)`);

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rowsToSync.length; i += BATCH_SIZE) {
      const batch = rowsToSync.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (row) => {
          if (!row.stripe_customer_id) {
            return { id: row.id, success: false, error: "No stripe_customer_id" };
          }

          if (row.stripe_customer_id.startsWith('acct_')) {
            console.log(`[sync-all] Skipping Connect account for ${row.email}: ${row.stripe_customer_id}`);
            return { id: row.id, success: true, skipped: true, message: "Connect account - skipped" };
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
            console.error(`[sync-all] Update error for ${row.id}:`, updateError);
            return { id: row.id, success: false, error: updateError.message };
          }

          const { inserted, skipped } = await insertMembershipPaymentsIfNeeded(
            row.profile_id,
            paymentData.all_payments_json
          );

          if (inserted > 0) {
            console.log(`[sync-all] Inserted ${inserted} payments for customer ${row.id}`);
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

      console.log(`[sync-all] Progress: ${Math.min(i + BATCH_SIZE, rowsToSync.length)}/${rowsToSync.length}`);

      if (i + BATCH_SIZE < rowsToSync.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`[sync-all] Complete: ${synced} synced, ${failed} failed`);

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: rowsToSync.length,
      errors: errors.slice(0, 10),
    });

  } catch (error: any) {
    console.error("[sync-all] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync payments" },
      { status: 500 }
    );
  }
}

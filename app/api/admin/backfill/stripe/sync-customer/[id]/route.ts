import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string | null;
  date: string;
  error_message: string | null;
  billing_reason: string | null;
  stripe_invoice_id: string;
  stripe_payment_id: string | null; // actual charge ID (from invoice.charge)
  payment_type: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncPaymentsForCustomer(
  stripeCustomerId: string,
  profileId: string | null
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

      // Rate limit
      await sleep(25);
    }

    // Process all invoices
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
      // Invoices with status "open" and a next_payment_attempt have failed payments
      if (status === "open" && invoice.next_payment_attempt) {
        errorMessage = "Payment attempt failed, retry scheduled";
        hasFailed = true;
      }

      // Note: Refund detection on invoices requires looking at related charges
      // For simplicity, we skip refund tracking on invoices

      const paymentType = invoice.billing_reason === "subscription_create" ? "signup" :
                         invoice.billing_reason === "subscription_cycle" ? "renewal" :
                         invoice.billing_reason === "subscription_update" ? "upgrade" : "renewal";

      if (status === "paid") {
        totalAmount += amount;
        if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
          latestSucceededPayment = { date, amount, status, payment_type: paymentType };
        }
      }

      // Access charge ID - Stripe Invoice has charge as string | Charge | null
      // For automatic payments, charge may be null - set stripe_payment_id to null in that case
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

    // Sort by date descending
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
    console.error(`[sync-customer] Error for customer ${stripeCustomerId}:`, error.message);
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
    if (payment.status !== "paid") {
      skipped++;
      continue;
    }

    // ALWAYS use stripe_invoice_id for duplicate detection
    const invoiceId = payment.stripe_invoice_id;

    if (!invoiceId) {
      console.warn(`[sync-customer] Skipping payment with no invoice ID for user ${profileId}`);
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

    // Determine payment type from billing_reason
    const paymentType = mapBillingReasonToPaymentType(payment.billing_reason);

    // Insert new record
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
      console.error(`[sync-customer] Failed to insert payment ${invoiceId}:`, insertError.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Fetch the row
    const { data: row, error: rowError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, stripe_customer_id, profile_id, email")
      .eq("id", id)
      .single();

    if (rowError || !row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    if (!row.stripe_customer_id) {
      return NextResponse.json({ error: "No stripe_customer_id" }, { status: 400 });
    }

    // Sync payments
    const paymentData = await syncPaymentsForCustomer(
      row.stripe_customer_id,
      row.profile_id
    );

    if (!paymentData) {
      return NextResponse.json({ error: "Stripe API error" }, { status: 500 });
    }

    // Update the row
    const { error: updateError } = await supabaseAdmin
      .from("stripe_backfill_status")
      .update({
        status: "matched",
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
      console.error(`[sync-customer] Update error for ${row.id}:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert succeeded payments into membership_payments if they don't exist
    const { inserted, skipped } = await insertMembershipPaymentsIfNeeded(
      row.profile_id,
      paymentData.all_payments_json
    );

    return NextResponse.json({
      success: true,
      paymentData,
      membershipPaymentsInserted: inserted,
      membershipPaymentsSkipped: skipped,
    });

  } catch (error: any) {
    console.error("[sync-customer] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync customer" },
      { status: 500 }
    );
  }
}

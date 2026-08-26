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
  status: string;
  date: string;
  error_message: string | null;
  billing_reason: string | null;
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
    // Fetch all charges for this customer
    const charges: Stripe.Charge[] = [];
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

      const response = await stripe.charges.list(params);
      charges.push(...response.data);

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }

      // Rate limit
      await sleep(25);
    }

    // Process all charges
    const allPayments: PaymentRecord[] = [];
    let totalAmount = 0;
    let hasFailed = false;
    let hasRefunded = false;
    let latestSucceededPayment: { date: string; amount: number; status: string } | null = null;

    for (const charge of charges) {
      const amount = charge.amount / 100;
      const status = charge.status;
      const date = new Date(charge.created * 1000).toISOString();

      let errorMessage: string | null = null;
      if (status === "failed" && charge.failure_message) {
        errorMessage = charge.failure_message;
        hasFailed = true;
      }

      if (status === "succeeded" && charge.refunds?.data && charge.refunds.data.length > 0) {
        hasRefunded = true;
      }

      if (status === "succeeded") {
        totalAmount += amount;
        if (!latestSucceededPayment || new Date(date) > new Date(latestSucceededPayment.date)) {
          latestSucceededPayment = { date, amount, status };
        }
      }

      allPayments.push({
        id: charge.id,
        amount,
        status,
        date,
        error_message: errorMessage,
        billing_reason: (charge as any).billing_reason || null,
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
      latest_payment_status: latestSucceededPayment?.status || null,
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
        stripe_invoice_id: payment.id,
        created_at: payment.date,
      });

    if (insertError) {
      console.error(`[sync-customer] Failed to insert payment ${payment.id}:`, insertError.message);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
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

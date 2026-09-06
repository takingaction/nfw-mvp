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
  stripe_payment_id: string | null;
  payment_type: string;
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

export async function POST(request: Request) {
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

    const { profile_id, stripe_customer_id } = await request.json();

    if (!profile_id || !stripe_customer_id) {
      return NextResponse.json(
        { error: "profile_id and stripe_customer_id are required" },
        { status: 400 }
      );
    }

    // Fetch all invoices for this customer
    const invoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: { customer: string; limit: number; starting_after?: string } = {
        customer: stripe_customer_id,
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

      await new Promise(r => setTimeout(r, 25));
    }

    const allPayments: PaymentRecord[] = [];

    for (const invoice of invoices) {
      const amount = invoice.amount_paid / 100;
      const status = invoice.status;
      const date = new Date(invoice.created * 1000).toISOString();

      let errorMessage: string | null = null;
      if (status === "open" && invoice.next_payment_attempt) {
        errorMessage = "Payment attempt failed, retry scheduled";
      }

      const chargeId = (invoice as any).charge;
      const stripePaymentId = typeof chargeId === 'string' ? chargeId : null;

      const paymentType = mapBillingReasonToPaymentType(invoice.billing_reason);

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

    // Insert payments that don't already exist
    let inserted = 0;
    let skipped = 0;

    for (const payment of allPayments) {
      if (payment.status !== "paid") {
        skipped++;
        continue;
      }

      // Check if already exists
      const { data: existing } = await supabaseAdmin
        .from("membership_payments")
        .select("id")
        .eq("stripe_invoice_id", payment.stripe_invoice_id)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabaseAdmin
        .from("membership_payments")
        .insert({
          user_id: profile_id,
          amount: payment.amount,
          payment_type: payment.payment_type,
          stripe_payment_id: payment.stripe_payment_id,
          stripe_invoice_id: payment.stripe_invoice_id,
          created_at: payment.date,
        });

      if (insertError) {
        console.error("[sync-single] Error inserting:", insertError);
        skipped++;
      } else {
        inserted++;
      }
    }

    // Update stripe_backfill_status with payment info
    const totalAmount = allPayments
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    await supabaseAdmin
      .from("stripe_backfill_status")
      .update({
        payment_count: allPayments.filter(p => p.status === "paid").length,
        total_amount: totalAmount,
        latest_payment_date: allPayments[0]?.date || null,
        latest_payment_status: allPayments[0]?.payment_type || null,
        latest_payment_amount: allPayments[0]?.amount || null,
        all_payments_json: allPayments,
        payment_sync_at: new Date().toISOString(),
        customer_processed_at: new Date().toISOString(),
      })
      .eq("profile_id", profile_id);

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total_payments: allPayments.length,
      message: `Inserted ${inserted} payments for this customer`,
    });

  } catch (error) {
    console.error("[sync-single] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync" },
      { status: 500 }
    );
  }
}

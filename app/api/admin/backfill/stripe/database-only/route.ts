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

export async function GET(request: Request) {
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

    // Get all payments from membership_payments with amount 15 or 100
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("membership_payments")
      .select(`
        id,
        stripe_payment_id,
        amount,
        created_at,
        user_id,
        profiles!inner(email, full_name)
      `)
      .in("amount", [15, 100]);

    if (paymentsError) {
      console.error("[database-only] Payments query error:", paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    const databaseOnlyPayments: any[] = [];

    // Check each payment against Stripe
    for (const payment of payments || []) {
      // Skip if no stripe_payment_id
      if (!payment.stripe_payment_id) {
        databaseOnlyPayments.push({
          id: payment.id,
          stripe_payment_id: null,
          email: (payment.profiles as any)?.email || "unknown",
          user_id: payment.user_id,
          amount: payment.amount,
          created_at: payment.created_at,
          issue: "missing_stripe_id",
        });
        continue;
      }

      try {
        // Try to retrieve the charge from Stripe
        const charge = await stripe.charges.retrieve(payment.stripe_payment_id);

        if (charge.status !== "succeeded") {
          // Charge exists but failed or refunded
          databaseOnlyPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            amount: payment.amount,
            created_at: payment.created_at,
            issue: charge.status === "failed" ? "failed" : "refunded",
            stripe_status: charge.status,
          });
        }
        // If succeeded, it's valid - skip it
      } catch (stripeError: any) {
        // Charge not found in Stripe - this is "Database Only"
        if (stripeError?.code === "resource_missing" || stripeError?.status === 404) {
          databaseOnlyPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            amount: payment.amount,
            created_at: payment.created_at,
            issue: "not_found",
            stripe_status: null,
          });
        } else {
          // Some other error - still include it as database only
          databaseOnlyPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            amount: payment.amount,
            created_at: payment.created_at,
            issue: "error",
            stripe_status: stripeError?.message || "unknown",
          });
        }
      }

      // Rate limit - be nice to Stripe
      await new Promise(r => setTimeout(r, 50));
    }

    // Sort by date, newest first
    databaseOnlyPayments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = databaseOnlyPayments.reduce((sum, p) => sum + p.amount, 0);

    console.log(`[database-only] Database Only payments found: ${databaseOnlyPayments.length}, total: $${total}`);

    return NextResponse.json({
      payments: databaseOnlyPayments,
      count: databaseOnlyPayments.length,
      total: total,
    });

  } catch (error: any) {
    console.error("[database-only] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get Database Only payments" },
      { status: 500 }
    );
  }
}
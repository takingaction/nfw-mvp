import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

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
    const supabase = await createSupabaseClient();
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

    // Get all contributing and founding profiles that have stripe_customer_id
    const { data: profilesToSync, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        stripe_customer_id,
        membership_level,
        first_paid_at
      `)
      .in("membership_level", ["contributing", "founding"]);

    if (profilesError) {
      console.error("[sync-missing-payments] Profiles query error:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get existing payments to avoid duplicates
    const { data: existingPayments, error: existingError } = await supabase
      .from("membership_payments")
      .select("user_id, stripe_payment_id");

    if (existingError) {
      console.error("[sync-missing-payments] Existing payments query error:", existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingPaymentsSet = new Set(
      existingPayments?.map(p => p.stripe_payment_id) || []
    );

    // Filter profiles that need syncing - have stripe_customer_id and no existing payment
    const profilesNeedingSync = profilesToSync?.filter(p => {
      if (!p.stripe_customer_id || p.stripe_customer_id.trim() === "") return false;
      if (existingPaymentsSet.has(p.stripe_customer_id)) return false;
      return true;
    }) || [];

    console.log(`[sync-missing-payments] Found ${profilesNeedingSync.length} profiles to sync`);

    // Process each profile
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const profile of profilesNeedingSync) {
      try {
        const stripeCustomerId = profile.stripe_customer_id;

        // Query Stripe for this customer's invoices (invoices have billing_reason)
        const invoices = await stripe.invoices.list({
          customer: stripeCustomerId,
          limit: 10,
        });

        // Find the first paid invoice (subscription_create or subscription_cycle)
        const paidInvoice = invoices.data.find(inv => inv.status === "paid");

        if (!paidInvoice) {
          console.error(`[sync-missing-payments] No paid invoice found for customer ${stripeCustomerId}`);
          results.failed++;
          results.errors.push(`No paid invoice found for ${profile.email}`);
          continue;
        }

        // Determine payment type from billing_reason
        const paymentType = mapBillingReasonToPaymentType(paidInvoice.billing_reason);

        // Determine amount from invoice amount_paid (in cents)
        const amount = paidInvoice.amount_paid / 100;

        // Use charge ID if available, otherwise set to null
        // For automatic payments, charge may be null - set stripe_payment_id to null in that case
        const chargeId = (paidInvoice as any).charge;
        const stripePaymentId = typeof chargeId === 'string' ? chargeId : null;

        // Insert the payment record
        const { error: insertError } = await supabase
          .from("membership_payments")
          .insert({
            user_id: profile.id,
            amount: amount,
            payment_type: paymentType,
            stripe_payment_id: stripePaymentId,
            stripe_invoice_id: paidInvoice.id,
            created_at: new Date(paidInvoice.created * 1000).toISOString(),
          });

        if (insertError) {
          console.error(`[sync-missing-payments] Insert error for ${profile.email}:`, insertError);
          results.failed++;
          results.errors.push(`Insert error for ${profile.email}: ${insertError.message}`);
        } else {
          console.log(`[sync-missing-payments] Synced payment for ${profile.email}: charge ${stripePaymentId}, type=${paymentType}, amount=${amount}`);
          results.success++;
        }

        // Rate limit - be nice to Stripe
        await new Promise(r => setTimeout(r, 100));

      } catch (stripeError: any) {
        console.error(`[sync-missing-payments] Stripe error for ${profile.email}:`, stripeError.message);
        results.failed++;
        results.errors.push(`Stripe error for ${profile.email}: ${stripeError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${results.success} synced, ${results.failed} failed`,
      results,
    });

  } catch (error: any) {
    console.error("[sync-missing-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync payments" },
      { status: 500 }
    );
  }
}

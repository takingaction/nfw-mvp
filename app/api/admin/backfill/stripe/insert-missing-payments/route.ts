import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    const body = await request.json();
    const accounts = body.accounts || [];

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({
        success: 0,
        failed: 0,
        skipped_no_profile: 0,
        errors: [] as string[],
        message: "No accounts provided",
      });
    }

    console.log(`[insert-missing-payments] Processing ${accounts.length} accounts`);

    const results = {
      success: 0,
      failed: 0,
      skipped_no_profile: 0,
      errors: [] as string[],
    };

    for (const account of accounts) {
      try {
        const { stripe_customer_id, profile_id, email, amount } = account;

        // Skip if no profile_id
        if (!profile_id) {
          console.log(`[insert-missing-payments] Skipping ${email}: no profile_id`);
          results.skipped_no_profile++;
          continue;
        }

        // Query Stripe for this customer's invoices
        const invoices = await stripe.invoices.list({
          customer: stripe_customer_id,
          limit: 10,
        });

        // Find the first paid invoice
        const paidInvoice = invoices.data.find(inv => inv.status === "paid");

        if (!paidInvoice) {
          console.log(`[insert-missing-payments] No paid invoice for ${email} (${stripe_customer_id})`);
          results.failed++;
          results.errors.push(`No paid invoice for ${email}`);
          continue;
        }

        // Check if payment already exists by stripe_invoice_id
        const { data: existingPayment } = await supabaseAdmin
          .from("membership_payments")
          .select("id")
          .eq("stripe_invoice_id", paidInvoice.id)
          .limit(1);

        if (existingPayment && existingPayment.length > 0) {
          console.log(`[insert-missing-payments] Payment already exists for ${email} (invoice ${paidInvoice.id}), skipping`);
          results.skipped_no_profile++;
          continue;
        }

        // Determine payment type from billing_reason
        const paymentType = mapBillingReasonToPaymentType(paidInvoice.billing_reason);

        // Use charge ID if available, otherwise set to null
        const chargeId = (paidInvoice as any).charge;
        const stripePaymentId = typeof chargeId === 'string' ? chargeId : null;

        // Insert the payment record
        const { error: insertError } = await supabaseAdmin
          .from("membership_payments")
          .insert({
            user_id: profile_id,
            amount: paidInvoice.amount_paid / 100,
            payment_type: paymentType,
            stripe_payment_id: stripePaymentId,
            stripe_invoice_id: paidInvoice.id,
            created_at: new Date(paidInvoice.created * 1000).toISOString(),
          });

        if (insertError) {
          console.error(`[insert-missing-payments] Insert error for ${email}:`, insertError);
          results.failed++;
          results.errors.push(`Insert error for ${email}: ${insertError.message}`);
        } else {
          console.log(`[insert-missing-payments] Inserted payment for ${email}: ${paymentType}, $${paidInvoice.amount_paid / 100}`);
          results.success++;
        }

        // Rate limit - be nice to Stripe (50ms = 20 customers/second)
        await new Promise(r => setTimeout(r, 50));

      } catch (accountError: any) {
        console.error(`[insert-missing-payments] Error for ${account.email}:`, accountError.message);
        results.failed++;
        results.errors.push(`Error for ${account.email}: ${accountError.message}`);
      }
    }

    const message = `Done: ${results.success} inserted, ${results.skipped_no_profile} skipped (no profile or already exists), ${results.failed} failed`;
    console.log(`[insert-missing-payments] ${message}`);

    return NextResponse.json({
      success: true,
      message,
      results,
    });

  } catch (error: any) {
    console.error("[insert-missing-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to insert payments" },
      { status: 500 }
    );
  }
}

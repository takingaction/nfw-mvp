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

    // Get all stripe_backfill_status rows with stripe_customer_id - with pagination
    const rowsToSync: { id: string; profile_id: string | null; email: string; stripe_customer_id: string }[] = [];
    let smpPage = 0;
    const smpPageSize = 1000;
    let smpHasMore = true;

    while (smpHasMore) {
      const { data: batch, error: rowsError } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select(`
          id,
          profile_id,
          email,
          stripe_customer_id
        `)
        .not("stripe_customer_id", "is", null)
        .range(smpPage * smpPageSize, (smpPage + 1) * smpPageSize - 1);

      if (rowsError) {
        console.error("[sync-missing-payments] Rows query error:", rowsError);
        return NextResponse.json({ error: rowsError.message }, { status: 500 });
      }

      if (batch && batch.length > 0) {
        rowsToSync.push(...batch);
        smpPage++;
        smpHasMore = batch.length === smpPageSize;
      } else {
        smpHasMore = false;
      }
    }

    console.log(`[sync-missing-payments] Found ${rowsToSync?.length || 0} rows to sync`);

    if (!rowsToSync || rowsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No rows with stripe_customer_id found in stripe_backfill_status",
      });
    }

    // Process each row
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const row of rowsToSync) {
      try {
        const stripeCustomerId = row.stripe_customer_id;

        // Query Stripe for this customer's invoices (invoices have billing_reason)
        const invoices = await stripe.invoices.list({
          customer: stripeCustomerId,
          limit: 10,
        });

        // Find the first paid invoice (subscription_create or subscription_cycle)
        const paidInvoice = invoices.data.find(inv => inv.status === "paid");

        if (!paidInvoice) {
          console.log(`[sync-missing-payments] No paid invoice found for customer ${stripeCustomerId} (${row.email})`);
          results.failed++;
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

        // Check if payment already exists by stripe_invoice_id
        const { data: existingPayment } = await supabaseAdmin
          .from("membership_payments")
          .select("id")
          .eq("stripe_invoice_id", paidInvoice.id)
          .limit(1);

        if (existingPayment && existingPayment.length > 0) {
          console.log(`[sync-missing-payments] Payment already exists for ${row.email} (invoice ${paidInvoice.id}), skipping`);
          continue;
        }

        // Insert the payment record
        const { error: insertError } = await supabaseAdmin
          .from("membership_payments")
          .insert({
            user_id: row.profile_id,
            amount: amount,
            payment_type: paymentType,
            stripe_payment_id: stripePaymentId,
            stripe_invoice_id: paidInvoice.id,
            created_at: new Date(paidInvoice.created * 1000).toISOString(),
          });

        if (insertError) {
          console.error(`[sync-missing-payments] Insert error for ${row.email}:`, insertError);
          results.failed++;
          results.errors.push(`Insert error for ${row.email}: ${insertError.message}`);
        } else {
          console.log(`[sync-missing-payments] Synced payment for ${row.email}: charge ${stripePaymentId}, type=${paymentType}, amount=${amount}`);
          results.success++;

          // Update stripe_backfill_status with status and stripe_customer_id
          const { error: statusUpdateError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .update({
              status: "matched",
              stripe_customer_id: stripeCustomerId,
              processed_at: new Date().toISOString(),
            })
            .eq("id", row.id);

          if (statusUpdateError) {
            console.error(`[sync-missing-payments] Status update error for ${row.email}:`, statusUpdateError);
          }
        }

        // Rate limit - be nice to Stripe
        await new Promise(r => setTimeout(r, 100));

      } catch (stripeError: any) {
        console.error(`[sync-missing-payments] Stripe error for ${row.email}:`, stripeError.message);
        results.failed++;
        results.errors.push(`Stripe error for ${row.email}: ${stripeError.message}`);
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

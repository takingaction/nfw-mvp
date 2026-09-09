import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

interface BackfillResult {
  processed: number;
  failed: number;
  errors: string[];
  results: {
    paymentId: string;
    stripeId: string;
    stripePaymentIntentId: string | null;
    success: boolean;
    error?: string;
  }[];
}

/**
 * POST /api/admin/backfill/stripe/backfill-payment-intents
 * 
 * Backfills stripe_payment_intent_id for existing membership_payments
 * by retrieving PaymentIntents from Stripe using stored charge/invoice IDs.
 */
export async function POST(request: Request) {
  try {
    console.log("[backfill-payment-intents] Starting backfill...");

    // Verify this is an admin request
    const adminCheck = await requireAdmin({ redirectOnFailure: false });
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all payments missing stripe_payment_intent_id
    const { data: payments, error: fetchError } = await supabaseAdmin
      .from("membership_payments")
      .select("id, user_id, amount, payment_type, stripe_payment_id, stripe_invoice_id, stripe_payment_intent_id")
      .is("stripe_payment_intent_id", null)
      .not("status", "eq", "refunded")
      .not("status", "eq", "disputed");

    if (fetchError) {
      console.error("[backfill-payment-intents] Error fetching payments:", fetchError);
      return NextResponse.json({ error: "Failed to fetch payments", details: fetchError }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        message: "No payments need backfilling",
        processed: 0,
        failed: 0,
        errors: []
      });
    }

    console.log(`[backfill-payment-intents] Found ${payments.length} payments to process`);

    const result: BackfillResult = {
      processed: 0,
      failed: 0,
      errors: [],
      results: []
    };

    // Process in batches of 100
    const BATCH_SIZE = 100;
    const DELAY_MS = 20; // 20ms delay = 50 requests/second, well under Stripe's 100/sec limit

    for (let i = 0; i < payments.length; i += BATCH_SIZE) {
      const batch = payments.slice(i, i + BATCH_SIZE);
      console.log(`[backfill-payment-intents] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}, payments ${i + 1}-${Math.min(i + BATCH_SIZE, payments.length)}`);

      // Process batch concurrently with delay
      const batchPromises = batch.map(async (payment) => {
        try {
          let stripePaymentIntentId: string | null = null;
          const stripeId = payment.stripe_payment_id || payment.stripe_invoice_id;

          if (!stripeId) {
            return {
              paymentId: payment.id,
              stripeId: "none",
              stripePaymentIntentId: null,
              success: false,
              error: "No stripe_payment_id or stripe_invoice_id to look up"
            };
          }

          // Try to get PaymentIntent from Stripe
          // First try by payment_intent if we have a charge ID
          if (payment.stripe_payment_id && payment.stripe_payment_id.startsWith("ch_")) {
            try {
              // Retrieve the charge to get its PaymentIntent
              const charge = await stripe.charges.retrieve(payment.stripe_payment_id);
              if (charge.payment_intent) {
                stripePaymentIntentId = charge.payment_intent as string;
              }
            } catch (chargeErr: any) {
              console.log(`[backfill-payment-intents] Could not get PI from charge ${payment.stripe_payment_id}:`, chargeErr.message);
            }
          }

          // If that didn't work, try to get PI from invoice if we have one
          if (!stripePaymentIntentId && payment.stripe_invoice_id) {
            try {
              const invoice = await stripe.invoices.retrieve(payment.stripe_invoice_id);
              if ((invoice as any).payment_intent) {
                stripePaymentIntentId = (invoice as any).payment_intent as string;
              }
            } catch (invoiceErr: any) {
              console.log(`[backfill-payment-intents] Could not get PI from invoice ${payment.stripe_invoice_id}:`, invoiceErr.message);
            }
          }

          // If we found a PaymentIntent ID, update the payment
          if (stripePaymentIntentId) {
            const { error: updateError } = await supabaseAdmin
              .from("membership_payments")
              .update({ stripe_payment_intent_id: stripePaymentIntentId })
              .eq("id", payment.id);

            if (updateError) {
              return {
                paymentId: payment.id,
                stripeId: stripeId,
                stripePaymentIntentId,
                success: false,
                error: `Update failed: ${updateError.message}`
              };
            }

            return {
              paymentId: payment.id,
              stripeId: stripeId,
              stripePaymentIntentId,
              success: true
            };
          }

          return {
            paymentId: payment.id,
            stripeId: stripeId,
            stripePaymentIntentId: null,
            success: false,
            error: "Could not find PaymentIntent ID from Stripe"
          };

        } catch (err: any) {
          console.error(`[backfill-payment-intents] Error processing payment ${payment.id}:`, err);
          return {
            paymentId: payment.id,
            stripeId: payment.stripe_payment_id || payment.stripe_invoice_id || "unknown",
            stripePaymentIntentId: null,
            success: false,
            error: err.message
          };
        }
      });

      // Wait for batch to complete with delay
      const batchResults = await Promise.all(batchPromises);
      
      // Add to overall results
      for (const r of batchResults) {
        if (r.success) {
          result.processed++;
        } else {
          result.failed++;
          if (r.error) result.errors.push(`${r.paymentId}: ${r.error}`);
        }
        result.results.push(r);
      }

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < payments.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`[backfill-payment-intents] Complete. Processed: ${result.processed}, Failed: ${result.failed}`);

    return NextResponse.json({
      message: `Backfill complete. Processed: ${result.processed}, Failed: ${result.failed}`,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors.slice(0, 20), // Limit errors in response
      totalResults: result.results.length
    });

  } catch (err: any) {
    console.error("[backfill-payment-intents] Fatal error:", err);
    return NextResponse.json({ error: "Fatal error", details: err.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/backfill/stripe/backfill-payment-intents
 * 
 * Returns count of payments needing backfill
 */
export async function GET(request: Request) {
  try {
    // Verify this is an admin request
    const adminCheck = await requireAdmin({ redirectOnFailure: false });
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: payments, count, error } = await supabaseAdmin
      .from("membership_payments")
      .select("id", { count: "exact" })
      .is("stripe_payment_intent_id", null)
      .not("status", "eq", "refunded")
      .not("status", "eq", "disputed");

    if (error) {
      return NextResponse.json({ error: "Failed to count payments", details: error }, { status: 500 });
    }

    return NextResponse.json({
      count: count || 0,
      message: count ? `${count} payments need backfilling` : "No payments need backfilling"
    });

  } catch (err: any) {
    console.error("[backfill-payment-intents] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

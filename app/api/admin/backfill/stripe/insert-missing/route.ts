import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getInvoicePaymentIds, mapBillingReasonToPaymentType } from "@/lib/stripe-payments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  void request;

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

    // Get all known payment IDs from membership_payments (both stripe_payment_id and stripe_invoice_id) - WITH PAGINATION
    const allPayments: { stripe_payment_id: string | null; stripe_invoice_id: string }[] = [];
    let paymentsPage = 0;
    const paymentsPageSize = 1000;
    let paymentsHasMore = true;

    while (paymentsHasMore) {
      const { data: paymentsBatch } = await supabaseAdmin
        .from("membership_payments")
        .select("stripe_payment_id, stripe_invoice_id")
        .range(paymentsPage * paymentsPageSize, (paymentsPage + 1) * paymentsPageSize - 1);

      if (paymentsBatch && paymentsBatch.length > 0) {
        allPayments.push(...paymentsBatch);
        paymentsPage++;
        paymentsHasMore = paymentsBatch.length === paymentsPageSize;
      } else {
        paymentsHasMore = false;
      }
    }

    const knownPaymentIds = new Set(allPayments.map(p => p.stripe_payment_id) || []);
    const knownInvoiceIds = new Set(allPayments.map(p => p.stripe_invoice_id) || []);

    // Get all matched Stripe customer IDs from backfill with their profile IDs - WITH PAGINATION
    const allBackfillMatched: { stripe_customer_id: string | null; profile_id: string | null; email: string }[] = [];
    let backfillPage = 0;
    let backfillHasMore = true;

    while (backfillHasMore) {
      const { data: backfillBatch } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("stripe_customer_id, profile_id, email")
        .eq("status", "matched")
        .range(backfillPage * 1000, (backfillPage + 1) * 1000 - 1);

      if (backfillBatch && backfillBatch.length > 0) {
        allBackfillMatched.push(...backfillBatch);
        backfillPage++;
        backfillHasMore = backfillBatch.length === 1000;
      } else {
        backfillHasMore = false;
      }
    }

    // Build customer ID -> profile ID map
    const customerToProfile = new Map<string, string>();
    for (const b of allBackfillMatched) {
      if (b.stripe_customer_id && b.profile_id) {
        customerToProfile.set(b.stripe_customer_id, b.profile_id);
      }
    }

    console.log(`[insert-missing] Loaded ${allPayments.length} existing payments, ${allBackfillMatched.length} matched backfill records`);

    // Get ALL Stripe invoices (not charges - invoices have billing_reason)
    const allInvoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    // Start from Jan 1, 2026 to limit scope
    const startDate = Math.floor(new Date("2026-01-01").getTime() / 1000);

    while (hasMore) {
      const params: Stripe.InvoiceListParams = {
        limit: 100,
        created: { gte: startDate },
        // Invoice.charge was removed in API 2025-03-31.basil; read IDs from payments.
        expand: ["data.payments"],
      };
      if (cursor) params.starting_after = cursor;

      const invoices = await stripe.invoices.list(params);

      for (const invoice of invoices.data) {
        // Only process paid invoices for membership amounts
        if (invoice.status !== "paid") continue;
        const amt = (invoice.amount_paid || 0) / 100;
        if (amt !== 15 && amt !== 100) continue; // Only membership payments
        allInvoices.push(invoice);
      }

      hasMore = invoices.has_more;
      if (hasMore && invoices.data.length > 0) {
        cursor = invoices.data[invoices.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Find unmatched invoices from matched customers
    const toInsert: {
      user_id: string;
      amount: number;
      payment_type: string;
      stripe_payment_id: string | null;
      stripe_payment_intent_id: string | null;
      stripe_invoice_id: string;
      created_at: string;
    }[] = [];

    for (const invoice of allInvoices) {
      // Skip if already recorded by invoice ID
      if (knownInvoiceIds.has(invoice.id)) {
        console.log(`[insert-missing] Skipping already-recorded invoice: ${invoice.id}`);
        continue;
      }

      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

      if (!customerId || !customerToProfile.has(customerId)) {
        continue; // Not from our matched customers
      }

      const profileId = customerToProfile.get(customerId)!;

      // Map billing_reason to payment_type (same logic as payment-sync cron)
      const paymentType = mapBillingReasonToPaymentType(invoice.billing_reason);

      const { chargeId, paymentIntentId } = getInvoicePaymentIds(invoice);

      // Skip if already recorded by charge ID
      if (chargeId && knownPaymentIds.has(chargeId)) {
        console.log(`[insert-missing] Skipping already-recorded charge: ${chargeId}`);
        continue;
      }

      toInsert.push({
        user_id: profileId,
        amount: (invoice.amount_paid || 0) / 100,
        payment_type: paymentType,
        stripe_payment_id: chargeId,
        stripe_payment_intent_id: paymentIntentId,
        stripe_invoice_id: invoice.id,
        created_at: new Date((invoice.created || 0) * 1000).toISOString(),
      });
    }

    console.log(`[insert-missing] Found ${toInsert.length} payments to insert out of ${allInvoices.length} total invoices`);

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No missing payments to insert",
        inserted: 0,
        total_amount: 0,
      });
    }

    // Sort by date ascending so first payments get "signup" type correctly
    toInsert.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Insert row-by-row so one invoice the webhook/cron already recorded
    // (unique violation on stripe_invoice_id) doesn't abort the whole batch.
    let insertedCount = 0;
    let alreadyPresent = 0;
    let totalAmount = 0;
    const failures: string[] = [];

    for (const row of toInsert) {
      const { error: insertError } = await supabaseAdmin
        .from("membership_payments")
        .insert(row);

      if (!insertError) {
        insertedCount++;
        totalAmount += row.amount;
      } else if (insertError.code === "23505") {
        alreadyPresent++;
      } else {
        console.error(`[insert-missing] Insert error for ${row.stripe_invoice_id}:`, insertError.message);
        failures.push(`${row.stripe_invoice_id}: ${insertError.message}`);
      }
    }

    if (insertedCount === 0 && failures.length > 0) {
      return NextResponse.json(
        { error: `Failed to insert payments: ${failures.slice(0, 3).join("; ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        `Inserted ${insertedCount} missing payments` +
        (alreadyPresent ? ` (${alreadyPresent} already recorded)` : "") +
        (failures.length ? ` — ${failures.length} failed, see logs` : ""),
      inserted: insertedCount,
      already_present: alreadyPresent,
      failed: failures.length,
      total_amount: totalAmount,
    });

  } catch (error) {
    console.error("[insert-missing] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to insert missing payments" },
      { status: 500 }
    );
  }
}

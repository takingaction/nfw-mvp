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
  // Request parameter required by Next.js but we don't use it
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

    // Get all known payment IDs from membership_payments - PAGINATED
    const allPayments: Array<{stripe_payment_id: string | null}> = [];
    let paymentsPageStart = 0;
    const paymentsPageSize = 1000;
    let paymentsHasMore = true;

    while (paymentsHasMore) {
      const { data: paymentsPage } = await supabaseAdmin
        .from("membership_payments")
        .select("stripe_payment_id")
        .range(paymentsPageStart, paymentsPageStart + paymentsPageSize - 1);

      if (paymentsPage && paymentsPage.length > 0) {
        allPayments.push(...paymentsPage);
        paymentsPageStart += paymentsPageSize;
      }
      paymentsHasMore = !!(paymentsPage && paymentsPage.length === paymentsPageSize);
    }

    const knownIds = new Set(allPayments.map(p => p.stripe_payment_id).filter(Boolean));

    // Get all matched Stripe customer IDs from backfill - PAGINATED
    const allBackfillMatched: Array<{stripe_customer_id: string | null; email: string}> = [];
    let backfillPageStart = 0;
    const backfillPageSize = 1000;
    let backfillHasMore = true;

    while (backfillHasMore) {
      const { data: backfillPage } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("stripe_customer_id, email")
        .eq("status", "matched")
        .range(backfillPageStart, backfillPageStart + backfillPageSize - 1);

      if (backfillPage && backfillPage.length > 0) {
        allBackfillMatched.push(...backfillPage);
        backfillPageStart += backfillPageSize;
      }
      backfillHasMore = !!(backfillPage && backfillPage.length === backfillPageSize);
    }

    const matchedCustomerIds = new Set(
      allBackfillMatched.map(b => b.stripe_customer_id).filter(Boolean)
    );

    // Get ALL Stripe charges
    const allCharges: Stripe.Charge[] = [];
    let hasMore = true;
    let cursor;

    while (hasMore) {
      const params: { limit: number; starting_after?: string } = { limit: 100 };
      if (cursor) params.starting_after = cursor;

      const charges = await stripe.charges.list(params);

      for (const c of charges.data) {
        if (c.status !== "succeeded") continue;
        const amt = c.amount / 100;
        if (amt !== 15 && amt !== 100) continue; // Only membership payments
        allCharges.push(c);
      }

      hasMore = charges.has_more;
      if (hasMore && charges.data.length > 0) {
        cursor = charges.data[charges.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Find unmatched charges from matched customers
    const unmatchedFromMatched: {
      charge_id: string;
      email: string;
      amount: number;
      customer_id: string;
      created: string;
    }[] = [];

    for (const c of allCharges) {
      if (knownIds.has(c.id)) continue; // Already in membership_payments
      const customerId = typeof c.customer === 'string' ? c.customer : null;
      if (!customerId || !matchedCustomerIds.has(customerId)) continue; // Not from our matched customers

      unmatchedFromMatched.push({
        charge_id: c.id,
        email: c.billing_details?.email || "",
        amount: c.amount / 100,
        customer_id: c.customer as string,
        created: new Date(c.created * 1000).toISOString(),
      });
    }

    // Sort by date descending
    unmatchedFromMatched.sort((a, b) =>
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    const totalAmount = unmatchedFromMatched.reduce((s, c) => s + c.amount, 0);

    return NextResponse.json({
      count: unmatchedFromMatched.length,
      total_amount: totalAmount,
      charges: unmatchedFromMatched,
    });

  } catch (error) {
    console.error("[missing-payments] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get missing payments" },
      { status: 500 }
    );
  }
}
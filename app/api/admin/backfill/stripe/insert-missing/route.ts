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

export async function POST(request: Request) {
  void request; // Required by Next.js but not used

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

    // Get all known payment IDs from membership_payments
    const { data: payments } = await supabaseAdmin
      .from("membership_payments")
      .select("stripe_payment_id");

    const knownIds = new Set(payments?.map(p => p.stripe_payment_id) || []);

    // Get all matched Stripe customer IDs from backfill with their profile IDs
    const { data: backfillMatched } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("stripe_customer_id, profile_id, email")
      .eq("status", "matched");

    // Build customer ID -> profile ID map
    const customerToProfile = new Map<string, string>();
    for (const b of backfillMatched || []) {
      if (b.stripe_customer_id && b.profile_id) {
        customerToProfile.set(b.stripe_customer_id, b.profile_id);
      }
    }

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
    const toInsert: {
      user_id: string;
      amount: number;
      payment_type: string;
      stripe_payment_id: string;
      stripe_invoice_id: string | null;
      created_at: string;
    }[] = [];

    for (const c of allCharges) {
      if (knownIds.has(c.id)) continue; // Already in membership_payments
      const customerId = typeof c.customer === 'string' ? c.customer : c.customer?.id;
      if (!customerId || !customerToProfile.has(customerId)) continue; // Not from our matched customers

      const profileId = customerToProfile.get(customerId)!;

      toInsert.push({
        user_id: profileId,
        amount: c.amount / 100,
        payment_type: "signup", // First payment for this customer
        stripe_payment_id: c.id,
        stripe_invoice_id: null,
        created_at: new Date(c.created * 1000).toISOString(),
      });
    }

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

    // Insert all missing payments
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("membership_payments")
      .insert(toInsert)
      .select("id");

    if (insertError) {
      console.error("[insert-missing] Insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to insert payments" },
        { status: 500 }
      );
    }

    const totalAmount = toInsert.reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      success: true,
      message: `Inserted ${inserted?.length || 0} missing payments`,
      inserted: inserted?.length || 0,
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
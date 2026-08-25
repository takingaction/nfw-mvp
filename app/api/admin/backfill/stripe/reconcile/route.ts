import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

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

    // Step 1: Get Stripe live stats
    let hasMore = true;
    let cursor;
    const allSubscriptions: Stripe.Subscription[] = [];

    while (hasMore) {
      const params: { limit: number; starting_after?: string; status: "active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused" } = {
        limit: 100,
        status: "active",
      };
      if (cursor) params.starting_after = cursor;

      const response = await stripe.subscriptions.list(params as any);

      for (const sub of response.data) {
        const priceAmount = sub.items.data[0]?.price?.unit_amount;
        if (priceAmount !== 1500 && priceAmount !== 10000) continue;
        allSubscriptions.push(sub);
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    // Calculate Stripe live totals
    let stripeContributingCount = 0;
    let stripeContributingTotal = 0;
    let stripeFoundingCount = 0;
    let stripeFoundingTotal = 0;

    for (const sub of allSubscriptions) {
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
      if (amount === 15) {
        stripeContributingCount++;
        stripeContributingTotal += amount;
      } else if (amount === 100) {
        stripeFoundingCount++;
        stripeFoundingTotal += amount;
      }
    }

    const stripeLive = {
      contributing: { count: stripeContributingCount, total: stripeContributingTotal },
      founding: { count: stripeFoundingCount, total: stripeFoundingTotal },
      total: { 
        count: stripeContributingCount + stripeFoundingCount, 
        total: stripeContributingTotal + stripeFoundingTotal 
      },
    };

    // Step 2: Get unique users per tier (count profiles, not payments)
    const { data: allPayments, error: paymentsError } = await supabase
      .from("membership_payments")
      .select(`
        id,
        amount,
        stripe_payment_id,
        created_at,
        user_id,
        profiles!inner(email, full_name)
      `)
      .in("amount", [15, 100]);

    if (paymentsError) {
      console.error("[reconcile] Payments query error:", paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Calculate our DB totals - count UNIQUE users per tier
    const contributingUserIds = new Set<string>();
    const foundingUserIds = new Set<string>();
    const allUserIds = new Set<string>();

    for (const p of allPayments || []) {
      if (p.amount === 15) {
        contributingUserIds.add(p.user_id);
        allUserIds.add(p.user_id);
      } else if (p.amount === 100) {
        foundingUserIds.add(p.user_id);
        allUserIds.add(p.user_id);
      }
    }

    const dbContributingCount = contributingUserIds.size;
    const dbFoundingCount = foundingUserIds.size;
    const dbContributingTotal = dbContributingCount * 15;
    const dbFoundingTotal = dbFoundingCount * 100;

    const ourDb = {
      contributing: { count: dbContributingCount, total: dbContributingTotal },
      founding: { count: dbFoundingCount, total: dbFoundingTotal },
      total: { 
        count: dbContributingCount + dbFoundingCount, 
        total: dbContributingTotal + dbFoundingTotal 
      },
    };

    // Use allPayments for individual payment verification
    const payments = allPayments;

    // Calculate differences
    const difference = {
      contributing: { 
        count: dbContributingCount - stripeContributingCount, 
        total: dbContributingTotal - stripeContributingTotal 
      },
      founding: { 
        count: dbFoundingCount - stripeFoundingCount, 
        total: dbFoundingTotal - stripeFoundingTotal 
      },
      total: { 
        count: (dbContributingCount + dbFoundingCount) - (stripeContributingCount + stripeFoundingCount), 
        total: (dbContributingTotal + dbFoundingTotal) - (stripeContributingTotal + stripeFoundingTotal) 
      },
    };

    // Step 3: Verify each payment against Stripe
    const problematicPayments: any[] = [];
    const verifiedCount = { valid: 0, refunded: 0, failed: 0, not_found: 0 };

    for (const payment of payments || []) {
      if (!payment.stripe_payment_id) {
        // Missing Stripe ID - can't verify
        problematicPayments.push({
          id: payment.id,
          stripe_payment_id: null,
          amount: payment.amount,
          email: (payment.profiles as any)?.email || "unknown",
          user_id: payment.user_id,
          created_at: payment.created_at,
          issue: "missing_stripe_id",
          stripe_status: null,
        });
        continue;
      }

      try {
        const charge = await stripe.charges.retrieve(payment.stripe_payment_id);
        const chargeStatus = charge.status as string;

        if (chargeStatus === "succeeded") {
          verifiedCount.valid++;
        } else if (chargeStatus === "refunded") {
          verifiedCount.refunded++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "refunded",
            stripe_status: "refunded",
          });
        } else if (chargeStatus === "failed") {
          verifiedCount.failed++;
          problematicPayments.push({
            id: payment.id,
            stripe_payment_id: payment.stripe_payment_id,
            amount: payment.amount,
            email: (payment.profiles as any)?.email || "unknown",
            user_id: payment.user_id,
            created_at: payment.created_at,
            issue: "failed",
            stripe_status: "failed",
          });
        }
      } catch (stripeError: any) {
        // Charge not found in Stripe
        verifiedCount.not_found++;
        problematicPayments.push({
          id: payment.id,
          stripe_payment_id: payment.stripe_payment_id,
          amount: payment.amount,
          email: (payment.profiles as any)?.email || "unknown",
          user_id: payment.user_id,
          created_at: payment.created_at,
          issue: "not_found",
          stripe_status: null,
        });
      }

      // Rate limit - be nice to Stripe
      await new Promise(r => setTimeout(r, 50));
    }

    return NextResponse.json({
      summary: {
        stripe_live: stripeLive,
        our_db: ourDb,
        difference,
      },
      verified: verifiedCount,
      problematic_payments: problematicPayments,
    });

  } catch (error: any) {
    console.error("[reconcile] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reconcile" },
      { status: 500 }
    );
  }
}

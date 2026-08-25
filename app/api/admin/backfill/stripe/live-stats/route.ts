import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    // Fetch all active subscriptions with $15 or $100 price
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
        // Check both legacy and new price models
        const priceAmount = sub.items.data[0]?.price?.unit_amount;

        // Filter for $15 (1500 cents) or $100 (10000 cents) only
        if (priceAmount !== 1500 && priceAmount !== 10000) continue;

        allSubscriptions.push(sub);
      }

      hasMore = response.has_more;
      if (hasMore && response.data.length > 0) {
        cursor = response.data[response.data.length - 1].id;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 25));
    }

    // Calculate stats
    let contributingCount = 0;
    let contributingRevenue = 0;
    let foundingCount = 0;
    let foundingRevenue = 0;

    for (const sub of allSubscriptions) {
      const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;

      if (amount === 15) {
        contributingCount++;
        contributingRevenue += amount;
      } else if (amount === 100) {
        foundingCount++;
        foundingRevenue += amount;
      }
    }

    return NextResponse.json({
      success: true,
      contributing: {
        count: contributingCount,
        revenue: contributingRevenue,
      },
      founding: {
        count: foundingCount,
        revenue: foundingRevenue,
      },
      total: {
        count: contributingCount + foundingCount,
        revenue: contributingRevenue + foundingRevenue,
      },
    });

  } catch (error) {
    console.error("[live-stats] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get live stats" },
      { status: 500 }
    );
  }
}
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

    // Fetch all Stripe subscriptions
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

    // Build email map with all subscription details per email
    const emailSubscriptionsMap = new Map<string, Array<{
      subscription_id: string;
      customer_id: string;
      tier: string;
      amount: number;
      status: string;
      current_period_start: number;
      current_period_end: number;
    }>>();

    for (const sub of allSubscriptions) {
      const priceAmount = sub.items.data[0]?.price?.unit_amount;
      if (priceAmount !== 1500 && priceAmount !== 10000) continue;

      const tier = priceAmount === 1500 ? "Contributing" : "Founding";
      const amount = priceAmount / 100;
      const customerId = typeof sub.customer === 'string' ? sub.customer : null;
      const subAny = sub as any;
      let email = subAny.billing_details?.email || "";

      // Fetch email from customer if not in subscription
      if (!email && customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          if (!customer.deleted && customer.email) {
            email = customer.email;
          }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 25));
      }

      if (email) {
        const emailLower = email.toLowerCase();
        if (!emailSubscriptionsMap.has(emailLower)) {
          emailSubscriptionsMap.set(emailLower, []);
        }
        emailSubscriptionsMap.get(emailLower)!.push({
          subscription_id: sub.id,
          customer_id: customerId || "",
          tier,
          amount,
          status: sub.status,
          current_period_start: (sub as any).current_period_start,
          current_period_end: (sub as any).current_period_end,
        });
      }
    }

    // Filter to emails with multiple subscriptions
    const duplicates: Array<{
      email: string;
      count: number;
      subscriptions: Array<{
        subscription_id: string;
        customer_id: string;
        tier: string;
        amount: number;
        status: string;
        current_period_start: number;
        current_period_end: number;
      }>;
    }> = [];

    for (const [email, subs] of emailSubscriptionsMap) {
      if (subs.length > 1) {
        duplicates.push({
          email,
          count: subs.length,
          subscriptions: subs.sort((a, b) => b.current_period_start - a.current_period_start),
        });
      }
    }

    // Sort by count descending
    duplicates.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      totalDuplicateSubscriptions: duplicates.reduce((sum, d) => sum + d.count, 0),
      uniqueEmailsWithDuplicates: duplicates.length,
      duplicates,
    });

  } catch (error) {
    console.error("[stripe-duplicates] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

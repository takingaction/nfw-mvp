import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`membership-upgrade:${ip}`, 5, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a contributing member and get stripe_customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, membership_level, stripe_customer_id")
      .eq("id", session.user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.membership_level !== "contributing") {
      return NextResponse.json(
        { error: "Only contributing members can upgrade to founding" },
        { status: 400 },
      );
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please contact support." },
        { status: 400 },
      );
    }

    // Find the active subscription for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "No active subscription found. Please contact support." },
        { status: 400 },
      );
    }

    const subscription = subscriptions.data[0];
    const foundingPriceId = process.env.STRIPE_PRICE_FOUNDING;

    if (!foundingPriceId) {
      return NextResponse.json(
        { error: "Stripe founding price not configured" },
        { status: 500 },
      );
    }

    // Update the subscription to founding price with proration
    // This charges the prorated difference immediately
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: foundingPriceId,
          },
        ],
        proration_behavior: "create_prorations",
        expand: ["latest_invoice"],
      }
    ) as unknown as Stripe.Subscription & { current_period_end: number };

    // Get the invoice to return payment status
    const latestInvoice = updatedSubscription.latest_invoice as Stripe.Invoice;

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      amountDue: latestInvoice.amount_due / 100, // Convert from cents
      nextBillingDate: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Membership upgrade error:", error);
    return NextResponse.json(
      { error: "Failed to process upgrade. Please try again." },
      { status: 500 },
    );
  }
}
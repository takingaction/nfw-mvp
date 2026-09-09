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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a contributing member and get stripe_customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, membership_level, stripe_customer_id")
      .eq("id", user.id)
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

    // Get origin for redirect URLs
    const origin = request.headers.get("origin") || "https://nationalfundforwomen.org";

    // Create Checkout Session for the $85 upgrade
    // This uses the customer's existing payment method via Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: profile.stripe_customer_id,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Membership Upgrade: Contributing to Founding",
              description: "One-time upgrade fee to change your annual membership from $15 to $100 per year",
            },
            unit_amount: 8500, // $85.00 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?upgrade=cancelled`,
      metadata: {
        userId: profile.id,
        upgrade_type: "contributing_to_founding",
        from_level: "contributing",
        to_level: "founding",
        amount: "85",
      },
    });

    console.log("[upgrade] Created checkout session:", session.id, "for user:", profile.id);

    // Return the session URL for frontend redirect
    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      message: "Redirecting to secure payment...",
    });
  } catch (error: any) {
    console.error("Membership upgrade error:", error);

    if (error.code === "customer_not_found") {
      return NextResponse.json(
        { error: "Customer not found in Stripe. Please contact support." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create upgrade session. Please try again." },
      { status: 500 },
    );
  }
}

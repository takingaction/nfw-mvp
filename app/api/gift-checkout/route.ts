import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const GIFT_PRICE_CENTS = 1500; // $15.00

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`gift-checkout:${ip}`, 5, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { quantity, buyerName, buyerEmail } = await request.json();

    if (!quantity || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 10" },
        { status: 400 },
      );
    }

    if (!buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: "Buyer name and email are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const origin = request.headers.get("origin") || "https://nationalfundforwomen.org";

    // Try to get logged-in user for prefill (optional)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (e) {
      // Continue without user ID - purchase doesn't require login
    }

    // Create Stripe Checkout session with one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "NFW Gift Membership",
              description: "1 year Contributing Membership ($15 value each)",
            },
            unit_amount: GIFT_PRICE_CENTS,
          },
          quantity,
        },
      ],
      customer_email: buyerEmail,
      success_url: `${origin}/gift-membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gift-membership`,
      metadata: {
        giftPurchase: "true",
        buyerName,
        buyerEmail,
        quantity: quantity.toString(),
        userId: userId || "",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Gift checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
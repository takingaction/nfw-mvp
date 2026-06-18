import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`resume-checkout:${ip}`, 5, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's active abandoned checkout
    const { data: abandoned } = await supabase
      .from("abandoned_checkouts")
      .select("id, membership_level, stripe_customer_id")
      .eq("user_id", session.user.id)
      .is("recovered_at", null)
      .single();

    if (!abandoned) {
      return NextResponse.json(
        { error: "No abandoned checkout found" },
        { status: 404 },
      );
    }

    // Determine price ID based on membership level
    const priceId =
      abandoned.membership_level === "founding"
        ? process.env.STRIPE_PRICE_FOUNDING
        : process.env.STRIPE_PRICE_CONTRIBUTING;

    if (!priceId) {
      return NextResponse.json(
        { error: "Membership price not configured" },
        { status: 500 },
      );
    }

    // Create a new checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get("origin") || "https://nationalfundforwomen.org"}/auth/welcome`,
      cancel_url: `${request.headers.get("origin") || "https://nationalfundforwomen.org"}/membership`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
        membershipLevel: abandoned.membership_level,
        resumedFrom: abandoned.id, // Track which abandoned checkout this resumed from
      },
    });

    // Update abandoned checkout with new session info
    await supabase
      .from("abandoned_checkouts")
      .update({
        stripe_session_id: checkoutSession.id,
        checkout_url: checkoutSession.url,
      })
      .eq("id", abandoned.id);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[api/checkout/resume] Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}

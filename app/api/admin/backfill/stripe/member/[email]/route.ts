import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get profile by email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        membership_level,
        subscription_status,
        stripe_customer_id,
        joined_at
      `)
      .ilike("email", email)
      .single();

    // Get all payments for this user
    const { data: payments } = await supabaseAdmin
      .from("membership_payments")
      .select("*")
      .eq("user_id", profile?.id || "")
      .order("created_at", { ascending: false });

    // Compute lifetime_value from membership_payments (only successful payments)
    const lifetimeValue = payments
      ? payments
          .filter((p: any) => p.status !== "failed" && p.status !== "rejected" && p.status !== "cancelled")
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      : 0;

    // Get backfill status for this email
    const { data: backfillRows } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("*")
      .ilike("email", email)
      .order("processed_at", { ascending: false });

    // If user has stripe_customer_id, get live Stripe subscription info
    let stripeSubscription = null;
    if (profile?.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          limit: 1,
        });
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0] as any;
          stripeSubscription = {
            id: sub.id,
            status: sub.status,
            current_period_start: sub.current_period_start,
            current_period_end: sub.current_period_end,
            amount: sub.items.data[0]?.price?.unit_amount || 0,
            price_name: sub.items.data[0]?.price?.nickname || "",
          };
        }
      } catch (stripeError) {
        console.error("[member] Stripe error:", stripeError);
        // Continue without Stripe data
      }
    }

    return NextResponse.json({
      success: true,
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        membership_level: profile.membership_level,
        subscription_status: profile.subscription_status,
        stripe_customer_id: profile.stripe_customer_id,
        lifetime_value: lifetimeValue,
        joined_at: profile.joined_at,
      } : null,
      payments: payments || [],
      backfillStatus: backfillRows || [],
      stripeSubscription,
      stripeDashboardUrl: profile?.stripe_customer_id 
        ? `https://dashboard.stripe.com/customers/${profile.stripe_customer_id}`
        : null,
      subscriptionDashboardUrl: stripeSubscription
        ? `https://dashboard.stripe.com/subscriptions/${stripeSubscription.id}`
        : null,
    });

  } catch (error) {
    console.error("[member] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

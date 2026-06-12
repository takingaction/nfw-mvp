import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get("grantId");

    if (!grantId) {
      return NextResponse.json({ error: "Missing grantId" }, { status: 400 });
    }

    // Get grant to verify it belongs to user
    const { data: grant } = await supabaseAdmin
      .from("grants")
      .select("id, user_id, stripe_connect_account_id")
      .eq("id", grantId)
      .eq("user_id", user.id)
      .single();

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    // If no Stripe account, return not-connected status
    if (!grant.stripe_connect_account_id) {
      return NextResponse.json({
        connected: false,
        status: "not_created",
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: null,
      });
    }

    // Get actual status from Stripe
    const account = await stripe.accounts.retrieve(grant.stripe_connect_account_id);

    return NextResponse.json({
      connected: !!(account.details_submitted && account.charges_enabled && account.payouts_enabled),
      status: account.details_submitted ? "complete" : "incomplete",
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements || null,
      email: account.email || null,
    });
  } catch (err) {
    console.error("[Stripe Connect Status] Error:", err);
    return NextResponse.json(
      { error: "Failed to check Stripe account status", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
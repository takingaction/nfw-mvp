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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { grantId } = await request.json();

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    // Get grant to verify it's approved and belongs to user
    const { data: grant } = await supabaseAdmin
      .from("grants")
      .select("id, status, stripe_connect_account_id")
      .eq("id", grantId)
      .eq("user_id", user.id)
      .single();

    if (!grant)
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    if (grant.status !== "approved" && grant.status !== "payment_pending") {
      return NextResponse.json(
        { error: "Grant is not approved" },
        { status: 400 },
      );
    }

    // Use existing Connect account or create new one
    let accountId =
      grant.stripe_connect_account_id || profile?.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile?.email || user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          userId: user.id,
          grantId,
        },
      });
      accountId = account.id;

      // Save to both profile and grant
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", user.id);
      await supabaseAdmin
        .from("grants")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", grantId);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.STRIPE_CONNECT_REFRESH_URL}?grantId=${grantId}`,
      return_url: `${process.env.STRIPE_CONNECT_RETURN_URL}?grantId=${grantId}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("[Stripe Connect] Error:", err);
    return NextResponse.json(
      { error: "Failed to create Stripe account link", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

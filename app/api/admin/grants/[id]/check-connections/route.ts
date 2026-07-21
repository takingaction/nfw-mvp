import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: cycleId } = await params;

    // Get the cycle
    const { data: cycle, error: cycleError } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name")
      .eq("id", cycleId)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: "Grant cycle not found" }, { status: 404 });
    }

    // Get all approved grants for this cycle
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        status,
        stripe_connect_account_id,
        profiles:user_id (id, stripe_onboarding_completed)
      `)
      .eq("cycle_id", cycleId)
      .eq("status", "approved");

    if (grantsError) {
      console.error("[check-connections] Error fetching grants:", grantsError);
      return NextResponse.json({ error: "Failed to fetch grants" }, { status: 500 });
    }

    const results: Array<{
      grantId: string;
      connected: boolean;
      details_submitted: boolean;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      stripe_onboarding_completed: boolean;
    }> = [];

    let connectedCount = 0;
    let notConnectedCount = 0;

    for (const grant of grants || []) {
      // Check if grant has stripe account
      if (!grant.stripe_connect_account_id) {
        results.push({
          grantId: grant.id,
          connected: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          stripe_onboarding_completed: false,
        });
        notConnectedCount++;
        continue;
      }

      try {
        // Call Stripe to get actual account status
        const account = await stripe.accounts.retrieve(grant.stripe_connect_account_id);

        const isConnected = !!(account.details_submitted && account.charges_enabled && account.payouts_enabled);

        // Update profiles.stripe_onboarding_completed to match reality
        const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
        if (profile?.id) {
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_onboarding_completed: isConnected })
            .eq("id", profile.id);
        }

        results.push({
          grantId: grant.id,
          connected: isConnected,
          details_submitted: !!account.details_submitted,
          charges_enabled: !!account.charges_enabled,
          payouts_enabled: !!account.payouts_enabled,
          stripe_onboarding_completed: isConnected,
        });

        if (isConnected) {
          connectedCount++;
        } else {
          notConnectedCount++;
        }
      } catch (stripeError: any) {
        console.error(`[check-connections] Stripe error for account ${grant.stripe_connect_account_id}:`, stripeError.message);

        // If Stripe account not found or error, mark as not connected
        results.push({
          grantId: grant.id,
          connected: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          stripe_onboarding_completed: false,
        });
        notConnectedCount++;
      }
    }

    console.log(`[check-connections] Checked ${results.length} accounts for cycle ${cycleId}: ${connectedCount} connected, ${notConnectedCount} not connected`);

    return NextResponse.json({
      results,
      summary: {
        checked: results.length,
        connected: connectedCount,
        notConnected: notConnectedCount,
      }
    });
  } catch (err: any) {
    console.error("[check-connections] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check connections" },
      { status: 500 }
    );
  }
}

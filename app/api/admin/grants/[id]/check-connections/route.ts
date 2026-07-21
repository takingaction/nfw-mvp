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
        profiles:user_id (id, stripe_onboarding_completed, stripe_connect_account_id)
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
      isRestricted: boolean;
    }> = [];

    let connectedCount = 0;
    let notConnectedCount = 0;

    for (const grant of grants || []) {
      // Use grant's stripe_connect_account_id, or fall back to profile's
      const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
      const stripeAccountId = grant.stripe_connect_account_id || profile?.stripe_connect_account_id;
      
      // Check if user has stripe account (either on grant or profile)
      if (!stripeAccountId) {
        results.push({
          grantId: grant.id,
          connected: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          isRestricted: false,
          stripe_onboarding_completed: !!profile?.stripe_onboarding_completed,
        });
        notConnectedCount++;
        continue;
      }

      try {
        // Call Stripe to get actual account status
        const account = await stripe.accounts.retrieve(stripeAccountId);

        // connected = details_submitted (they've started the Stripe onboarding)
        const connected = !!account.details_submitted;
        // isRestricted = charges or payouts are disabled
        const isRestricted = !account.charges_enabled || !account.payouts_enabled;

        // Update profiles.stripe_onboarding_completed to match reality (only if fully connected)
        const profile = Array.isArray(grant.profiles) ? grant.profiles[0] : grant.profiles;
        if (profile?.id) {
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_onboarding_completed: connected && !isRestricted })
            .eq("id", profile.id);
        }

        results.push({
          grantId: grant.id,
          connected,
          details_submitted: !!account.details_submitted,
          charges_enabled: !!account.charges_enabled,
          payouts_enabled: !!account.payouts_enabled,
          isRestricted,
          stripe_onboarding_completed: connected && !isRestricted,
        });

        if (!connected) {
          notConnectedCount++;
        } else if (isRestricted) {
          notConnectedCount++; // Count restricted as not ready
        } else {
          connectedCount++;
        }
      } catch (stripeError: any) {
        console.error(`[check-connections] Stripe error for account ${stripeAccountId}:`, stripeError.message);

        // If Stripe account not found or error, mark as not connected
        results.push({
          grantId: grant.id,
          connected: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          isRestricted: false,
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

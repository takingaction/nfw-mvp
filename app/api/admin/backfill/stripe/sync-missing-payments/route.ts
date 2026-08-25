import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Admin auth check
    const supabase = await createSupabaseClient();
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

    // Get all profiles that are contributing, matched in Stripe with lifetime_value > 0, but missing from membership_payments
    const { data: profilesToSync, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        stripe_customer_id,
        first_paid_at
      `)
      .eq("membership_level", "contributing");

    if (profilesError) {
      console.error("[sync-missing-payments] Profiles query error:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get profiles that are matched in stripe_backfill_status with lifetime_value > 0
    const { data: backfillData, error: backfillError } = await supabase
      .from("stripe_backfill_status")
      .select("profile_id, stripe_customer_id, lifetime_value, processed_at")
      .eq("status", "matched")
      .gt("lifetime_value", 0);

    if (backfillError) {
      console.error("[sync-missing-payments] Backfill query error:", backfillError);
      return NextResponse.json({ error: backfillError.message }, { status: 500 });
    }

    // Create a map for quick lookup
    const backfillMap = new Map(
      backfillData?.map(b => [b.profile_id, b]) || []
    );

    // Get existing payments to avoid duplicates
    const { data: existingPayments, error: existingError } = await supabase
      .from("membership_payments")
      .select("user_id, payment_type")
      .in("payment_type", ["signup", "renewal", "upgrade"]);

    if (existingError) {
      console.error("[sync-missing-payments] Existing payments query error:", existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingPaymentsSet = new Set(
      existingPayments?.map(p => `${p.user_id}-${p.payment_type}`) || []
    );

    // Filter profiles that need syncing (use stripe_customer_id from backfill, not profiles)
    const profilesNeedingSync = profilesToSync?.filter(p => {
      const backfill = backfillMap.get(p.id);
      if (!backfill?.stripe_customer_id || backfill.stripe_customer_id.trim() === "") return false;
      if (!backfill || backfill.lifetime_value <= 0) return false;
      if (existingPaymentsSet.has(`${p.id}-signup`)) return false;
      return true;
    }) || [];

    console.log(`[sync-missing-payments] Found ${profilesNeedingSync.length} profiles to sync`);

    // Process each profile
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const profile of profilesNeedingSync) {
      try {
        const backfill = backfillMap.get(profile.id);
        const stripeCustomerId = backfill?.stripe_customer_id;

        // Skip if no Stripe customer ID in backfill
        if (!stripeCustomerId || stripeCustomerId.trim() === "") {
          console.error(`[sync-missing-payments] No stripe_customer_id in backfill for ${profile.email}`);
          results.failed++;
          results.errors.push(`No Stripe customer ID in backfill for ${profile.email}`);
          continue;
        }

        // Query Stripe for this customer's charges
        const charges = await stripe.charges.list({
          customer: stripeCustomerId,
          limit: 1,
        });

        if (!charges.data || charges.data.length === 0) {
          console.error(`[sync-missing-payments] No charges found for customer ${stripeCustomerId}`);
          results.failed++;
          results.errors.push(`No charges found for ${profile.email}`);
          continue;
        }

        const charge = charges.data[0];

        // Insert the payment record
        const { error: insertError } = await supabase
          .from("membership_payments")
          .insert({
            user_id: profile.id,
            amount: 15,
            payment_type: "signup",
            stripe_payment_id: charge.id,
            created_at: profile.first_paid_at || new Date().toISOString(),
          });

        if (insertError) {
          console.error(`[sync-missing-payments] Insert error for ${profile.email}:`, insertError);
          results.failed++;
          results.errors.push(`Insert error for ${profile.email}: ${insertError.message}`);
        } else {
          console.log(`[sync-missing-payments] Synced payment for ${profile.email}: charge ${charge.id}`);
          results.success++;
        }

        // Rate limit - be nice to Stripe
        await new Promise(r => setTimeout(r, 100));

      } catch (stripeError: any) {
        console.error(`[sync-missing-payments] Stripe error for ${profile.email}:`, stripeError.message);
        results.failed++;
        results.errors.push(`Stripe error for ${profile.email}: ${stripeError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${results.success} synced, ${results.failed} failed`,
      results,
    });

  } catch (error: any) {
    console.error("[sync-missing-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync payments" },
      { status: 500 }
    );
  }
}

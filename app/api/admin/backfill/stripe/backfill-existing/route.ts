import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
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

    console.log("[backfill-existing] Starting one-time backfill of missing paid members...");

    // Get all profile IDs that are already in stripe_backfill_status
    const { data: existingBackfill } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("profile_id")
      .not("profile_id", "is", null);

    const existingIds = new Set(
      (existingBackfill || []).map(r => r.profile_id).filter(Boolean)
    );

    // Get all paid profiles NOT in stripe_backfill_status
    const { data: paidProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, membership_level, stripe_customer_id")
      .in("membership_level", ["contributing", "founding"])
      .eq("profile_completed", true)
      .neq("is_admin", true);

    if (profilesError) {
      console.error("[backfill-existing] Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Filter to only NEW paid profiles (not already in backfill)
    const missingProfiles = (paidProfiles || []).filter(p => !existingIds.has(p.id));

    console.log(`[backfill-existing] Found ${missingProfiles.length} paid profiles to backfill`);

    if (missingProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No missing profiles to backfill",
        synced: 0,
        notFound: 0,
        withStripeId: 0,
        errors: 0,
      });
    }

    let matched = 0;
    let notFound = 0;
    let withStripeId = 0;
    let errors = 0;
    const results: Array<{
      email: string;
      profile_id: string;
      status: string;
      stripe_customer_id?: string;
      error?: string;
    }> = [];

    for (const profile of missingProfiles) {
      try {
        let stripeCustomerId: string | null = null;

        // First, try to use existing stripe_customer_id on profile
        if (profile.stripe_customer_id) {
          try {
            const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
            if (!customer.deleted) {
              stripeCustomerId = profile.stripe_customer_id;
            }
          } catch (e) {
            // Customer was deleted or invalid, continue to email lookup
            stripeCustomerId = null;
          }
        }

        // If no valid stripe_customer_id, search by email
        if (!stripeCustomerId && profile.email) {
          const customers = await stripe.customers.list({
            email: profile.email,
            limit: 1,
          });

          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
          }
        }

        if (stripeCustomerId) {
          // Get subscription info for lifetime value
          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            limit: 1,
            status: "active",
          });

          // Insert into stripe_backfill_status
          const { error: insertError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .insert({
              profile_id: profile.id,
              email: profile.email,
              stripe_customer_id: stripeCustomerId,
              status: "matched",
              processed_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[backfill-existing] Error inserting for ${profile.email}:`, insertError);
            errors++;
            results.push({
              email: profile.email,
              profile_id: profile.id,
              status: "error",
              stripe_customer_id: stripeCustomerId,
              error: insertError.message,
            });
          } else {
            matched++;
            if (profile.stripe_customer_id) withStripeId++;
            console.log(`[backfill-existing] Matched: ${profile.email} -> ${stripeCustomerId}`);
            results.push({
              email: profile.email,
              profile_id: profile.id,
              status: "matched",
              stripe_customer_id: stripeCustomerId,
            });
          }
        } else {
          // No Stripe customer found
          const { error: insertError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .insert({
              profile_id: profile.id,
              email: profile.email,
              status: "not_found",
              processed_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[backfill-existing] Error inserting not_found for ${profile.email}:`, insertError);
            errors++;
            results.push({
              email: profile.email,
              profile_id: profile.id,
              status: "error",
              error: insertError.message,
            });
          } else {
            notFound++;
            console.log(`[backfill-existing] Not found in Stripe: ${profile.email}`);
            results.push({
              email: profile.email,
              profile_id: profile.id,
              status: "not_found",
            });
          }
        }

        // Rate limit - wait 100ms between Stripe API calls
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.error(`[backfill-existing] Error processing ${profile.email}:`, err);
        errors++;
        results.push({
          email: profile.email,
          profile_id: profile.id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    console.log(`[backfill-existing] Complete. Matched: ${matched}, Not found: ${notFound}, With Stripe ID: ${withStripeId}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      message: `Backfill complete`,
      synced: matched,
      notFound,
      withStripeId,
      errors,
      total: missingProfiles.length,
      results,
    });

  } catch (error) {
    console.error("[backfill-existing] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

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

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[backfill-sync] Starting hourly backfill sync...");

    // Get paid profiles NOT in stripe_backfill_status (paginated to avoid timeout)
    const { data: paidProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, membership_level")
      .in("membership_level", ["contributing", "founding"])
      .eq("profile_completed", true)
      .neq("is_admin", true)
      .limit(100);

    if (profilesError) {
      console.error("[backfill-sync] Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get existing profile_ids in stripe_backfill_status
    const { data: existingBackfill } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("profile_id")
      .not("profile_id", "is", null);

    const existingIds = new Set((existingBackfill || []).map(r => r.profile_id).filter(Boolean));

    // Filter to only NEW paid profiles (not already in backfill)
    const newProfiles = (paidProfiles || []).filter(p => !existingIds.has(p.id));

    console.log(`[backfill-sync] Found ${newProfiles.length} new paid profiles to sync`);

    if (newProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new profiles to sync",
        synced: 0,
        notFound: 0,
      });
    }

    let matched = 0;
    let notFound = 0;
    let errors = 0;

    for (const profile of newProfiles) {
      try {
        if (!profile.email) {
          notFound++;
          continue;
        }

        // Search for customer by email in Stripe
        const customers = await stripe.customers.list({
          email: profile.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          const customer = customers.data[0];

          // Get subscription info
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 1,
            status: "active",
          });

          // Upsert into stripe_backfill_status (ignore if already exists)
          const { error: insertError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .upsert({
              profile_id: profile.id,
              email: profile.email,
              stripe_customer_id: customer.id,
              status: "matched",
              processed_at: new Date().toISOString(),
            }, {
              onConflict: 'profile_id',
              ignoreDuplicates: true,
            });

          if (insertError) {
            console.error(`[backfill-sync] Error inserting for ${profile.email}:`, insertError);
            errors++;
          } else {
            matched++;
          }
        } else {
          // No Stripe customer found - upsert to avoid duplicate errors
          await supabaseAdmin
            .from("stripe_backfill_status")
            .upsert({
              profile_id: profile.id,
              email: profile.email,
              status: "not_found",
              processed_at: new Date().toISOString(),
            }, {
              onConflict: 'profile_id',
              ignoreDuplicates: true,
            });
          notFound++;
        }

        // Rate limit - wait 100ms between Stripe API calls
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.error(`[backfill-sync] Error processing ${profile.email}:`, err);
        errors++;
      }
    }

    console.log(`[backfill-sync] Complete. Matched: ${matched}, Not found: ${notFound}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      message: `Sync complete`,
      synced: matched,
      notFound,
      errors,
      total: newProfiles.length,
    });

  } catch (error) {
    console.error("[backfill-sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

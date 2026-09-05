import { NextResponse } from "next/server";
import Stripe from "stripe";
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

    // Get paid profiles NOT in stripe_backfill_status - PAGINATED
    const allPaidProfiles: Array<{
      id: string;
      email: string | null;
      full_name: string | null;
      membership_level: string | null;
      stripe_customer_id: string | null;
    }> = [];
    let profilesPageStart = 0;
    const profilesPageSize = 1000;
    let profilesHasMore = true;

    while (profilesHasMore) {
      const { data: profilesPage, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, membership_level, stripe_customer_id")
        .not("email", "is", null)
        .range(profilesPageStart, profilesPageStart + profilesPageSize - 1);

      if (profilesError) {
        console.error("[backfill-sync] Error fetching profiles:", profilesError);
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      if (profilesPage && profilesPage.length > 0) {
        allPaidProfiles.push(...profilesPage);
        profilesPageStart += profilesPageSize;
      }
      profilesHasMore = !!(profilesPage && profilesPage.length === profilesPageSize);
    }

    // Get existing profile_ids in stripe_backfill_status (with pagination to bypass PostgREST max-rows cap)
    const existingIds = new Set<string>();
    let bpPage = 0;
    const bpPageSize = 1000;
    let bpHasMore = true;

    while (bpHasMore) {
      const { data: backfillBatch } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("profile_id")
        .not("profile_id", "is", null)
        .range(bpPage * bpPageSize, (bpPage + 1) * bpPageSize - 1);

      if (backfillBatch && backfillBatch.length > 0) {
        backfillBatch.forEach(r => { if (r.profile_id) existingIds.add(r.profile_id); });
        bpPage++;
        bpHasMore = backfillBatch.length === bpPageSize;
      } else {
        bpHasMore = false;
      }
    }

    // Filter to only NEW paid profiles (not already in backfill)
    const missingProfiles = allPaidProfiles.filter(p => !existingIds.has(p.id));

    console.log(`[backfill-sync] Found ${missingProfiles.length} paid profiles to backfill`);

    if (missingProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No missing profiles to backfill",
        synced: 0,
        notFound: 0,
        errors: 0,
      });
    }

    let matched = 0;
    let notFound = 0;
    let withStripeId = 0;
    let errors = 0;

    for (const profile of missingProfiles) {
      try {
        let stripeCustomerId: string | null = null;

        // FIRST: Try existing stripe_customer_id on profile
        if (profile.stripe_customer_id) {
          try {
            const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
            if (!customer.deleted) {
              stripeCustomerId = profile.stripe_customer_id;
            }
          } catch {
            // Customer was deleted or invalid, continue to email lookup
            stripeCustomerId = null;
          }
        }

        // SECOND: Fall back to email search
        if (!stripeCustomerId && profile.email) {
          const customers = await stripe.customers.list({
            email: profile.email || "",
            limit: 1,
          });

          if (customers.data.length > 0) {
            stripeCustomerId = customers.data[0].id;
          }
        }

        if (stripeCustomerId) {
          // Get subscription info for lifetime value
          await stripe.subscriptions.list({
            customer: stripeCustomerId,
            limit: 1,
            status: "active",
          });

          // Insert into stripe_backfill_status (upsert to prevent duplicates if run twice)
          const { error: upsertError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .upsert({
              profile_id: profile.id,
              email: profile.email || "",
              stripe_customer_id: stripeCustomerId,
              status: "matched",
              processed_at: new Date().toISOString(),
            }, {
              onConflict: "profile_id",
            });

          if (upsertError) {
            console.error(`[backfill-sync] Error upserting for ${profile.email}:`, upsertError);
            errors++;
          } else {
            matched++;
            if (profile.stripe_customer_id) withStripeId++;
            console.log(`[backfill-sync] Matched: ${profile.email} -> ${stripeCustomerId}`);
          }
        } else {
          // No Stripe customer found
          const { error: insertError } = await supabaseAdmin
            .from("stripe_backfill_status")
            .insert({
              profile_id: profile.id,
              email: profile.email || "",
              status: "not_found",
              processed_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[backfill-sync] Error inserting not_found for ${profile.email}:`, insertError);
            errors++;
          } else {
            notFound++;
            console.log(`[backfill-sync] Not found in Stripe: ${profile.email}`);
          }
        }

        // Rate limit - wait 100ms between Stripe API calls
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.error(`[backfill-sync] Error processing ${profile.email}:`, err);
        errors++;
      }
    }

    console.log(`[backfill-sync] Complete. Matched: ${matched}, Not found: ${notFound}, With Stripe ID: ${withStripeId}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      message: `Backfill complete`,
      synced: matched,
      notFound,
      withStripeId,
      errors,
      total: missingProfiles.length,
    });

  } catch (error) {
    console.error("[backfill-sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

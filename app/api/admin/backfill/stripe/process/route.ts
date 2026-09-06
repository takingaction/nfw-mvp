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

// Get or build email map (exported from main route)
async function getEmailMap() {
  // Import from parent route module
  const { getEmailMap: getMap } = await import("../route");
  return getMap();
}

export async function POST(request: Request) {
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

    // Get email map
    const emailToStripeId = await getEmailMap();

    // Get next batch of pending profiles (10 at a time)
    const { data: pendingProfiles } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, profile_id, email")
      .eq("status", "pending")
      .order("processed_at", { ascending: true })
      .limit(10);

    if (!pendingProfiles || pendingProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No more profiles to process",
        processed: 0,
      });
    }

    console.log(`[backfill] Processing batch of ${pendingProfiles.length} profiles`);

    const results = {
      matched: 0,
      not_found: 0,
      errors: 0,
    };

    for (const pending of pendingProfiles) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from("stripe_backfill_status")
          .update({ status: "processing" })
          .eq("id", pending.id);

        const email = pending.email?.toLowerCase();
        const stripeCustomerId = email ? emailToStripeId.get(email) : null;

        if (!stripeCustomerId) {
          await supabaseAdmin
            .from("stripe_backfill_status")
            .update({
              status: "not_found",
              error_message: "No Stripe customer found for this email",
              processed_at: new Date().toISOString(),
            })
            .eq("id", pending.id);
          results.not_found++;
          continue;
        }

        // Update backfill status
        await supabaseAdmin
          .from("stripe_backfill_status")
          .update({
            status: "matched",
            stripe_customer_id: stripeCustomerId,
            processed_at: new Date().toISOString(),
          })
          .eq("id", pending.id);

        // Also update the profile
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: stripeCustomerId,
          })
          .eq("id", pending.profile_id);

        results.matched++;

        // Rate limit protection
        await new Promise(r => setTimeout(r, 25));

      } catch (err: any) {
        await supabaseAdmin
          .from("stripe_backfill_status")
          .update({
            status: "error",
            error_message: err.message,
            processed_at: new Date().toISOString(),
          })
          .eq("id", pending.id);
        results.errors++;
        console.error(`[backfill] Error processing ${pending.email}:`, err);
      }
    }

    console.log(`[backfill] Batch complete:`, results);

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingProfiles.length} profiles`,
      ...results,
    });

  } catch (error: any) {
    console.error("[backfill] Error:", error);
    return NextResponse.json(
      { error: error.message || "Batch processing failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST() {
  try {
    await requireAdmin();

    let updatedCount = 0;
    let processedCount = 0;
    const errors: string[] = [];

    // Fetch checkout sessions from Stripe (paginate through all)
    const sessions: Stripe.Checkout.Session[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.checkout.sessions.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

      sessions.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }

      // Safety limit for backfill
      if (sessions.length >= 1000) break;
    }

    console.log(`[Backfill] Found ${sessions.length} checkout sessions to process`);

    for (const session of sessions) {
      processedCount++;

      // Skip gift purchases
      if (session.metadata?.giftPurchase === "true") continue;

      const userId = session.metadata?.userId;
      const membershipLevel = session.metadata?.membershipLevel;

      if (!userId || !membershipLevel) continue;

      try {
        // Get current profile to check existing values
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_paid_at, first_paid_level, membership_level")
          .eq("id", userId)
          .single();

        if (!profile) {
          console.log(`[Backfill] Profile not found for userId: ${userId}`);
          continue;
        }

        // Only update if first_paid_at is not set
        if (!profile.first_paid_at) {
          await supabaseAdmin
            .from("profiles")
            .update({
              first_paid_at: new Date(session.created * 1000).toISOString(),
              first_paid_level: membershipLevel,
              // Also sync membership level if Stripe shows higher level
              membership_level: membershipLevel,
            })
            .eq("id", userId);

          updatedCount++;
          console.log(`[Backfill] Updated profile ${userId} with first_paid_at`);
        } else {
          // Check if membership_level needs updating (user upgraded via Stripe)
          const levelRank: Record<string, number> = { free: 0, contributing: 1, founding: 2 };
          const currentRank = levelRank[profile.membership_level || "free"] || 0;
          const stripeRank = levelRank[membershipLevel] || 0;

          if (stripeRank > currentRank) {
            await supabaseAdmin
              .from("profiles")
              .update({ membership_level: membershipLevel })
              .eq("id", userId);
            updatedCount++;
            console.log(`[Backfill] Upgraded profile ${userId} from ${profile.membership_level} to ${membershipLevel}`);
          }
        }
      } catch (err) {
        console.error(`[Backfill] Error processing session ${session.id}:`, err);
        errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[Backfill] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
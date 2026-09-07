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

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

const DELAY_MS = 50;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get("Authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pick up one pending job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("stripe_only_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      // Check for stale processing jobs
      const { data: staleJob } = await supabaseAdmin
        .from("stripe_only_jobs")
        .select("*")
        .eq("status", "processing")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (staleJob) {
        const processingTime = Date.now() - new Date(staleJob.created_at).getTime();
        if (processingTime > 10 * 60 * 1000) {
          await supabaseAdmin
            .from("stripe_only_jobs")
            .update({ status: "failed", error: "Job timed out", completed_at: new Date().toISOString() })
            .eq("id", staleJob.id);
          return NextResponse.json({ message: "Marked stale job as failed" });
        }
        return NextResponse.json({ message: "Job still processing", jobId: staleJob.id });
      }

      return NextResponse.json({ message: "No pending stripe_only jobs" });
    }

    // Mark job as processing
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    try {
      // Get all charges from Stripe
      const charges: any[] = [];
      let hasMore = true;
      let cursor;

      const MEMBERSHIP_CREATED_AFTER = Math.floor(new Date("2026-01-01").getTime() / 1000);

      while (hasMore) {
        const params: any = {
          limit: 100,
          created: { gte: MEMBERSHIP_CREATED_AFTER },
        };
        if (cursor) params.starting_after = cursor;

        const response = await stripe.charges.list(params);
        hasMore = response.has_more;

        for (const charge of response.data) {
          const amount = charge.amount / 100;
          if (amount === 15 || amount === 100) {
            charges.push({
              charge_id: charge.id,
              customer_id: charge.customer,
              email: charge.billing_details?.email || "",
              name: charge.billing_details?.name || "",
              amount: amount,
              created: new Date(charge.created * 1000).toISOString(),
              status: charge.status,
              refunded: charge.refunded,
            });
          }
        }

        if (response.data.length > 0) {
          cursor = response.data[response.data.length - 1].id;
        }

        await delay(DELAY_MS);
      }

      // Step A: Get all profile emails for matching
      const allProfiles: any[] = [];
      let pageStart = 0;
      const pageSize = 1000;
      let profileHasMore = true;

      while (profileHasMore) {
        const { data: profilesPage, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .range(pageStart, pageStart + pageSize - 1);

        if (profileError) {
          throw new Error(`Error fetching profiles: ${profileError.message}`);
        }

        if (profilesPage && profilesPage.length > 0) {
          allProfiles.push(...profilesPage);
          pageStart += pageSize;
        }

        profileHasMore = profilesPage && profilesPage.length === pageSize;
      }

      // Build email → profile map (case-insensitive)
      const profileByEmail = new Map<string, any>();
      for (const profile of allProfiles) {
        if (profile.email) {
          profileByEmail.set(profile.email.toLowerCase(), profile);
        }
      }

      // Step B: Fetch gift purchases for matching
      const { data: giftPurchases } = await supabaseAdmin
        .from("gift_membership_purchases")
        .select("id, buyer_email, stripe_payment_intent_id, stripe_session_id");

      // Build maps for gift purchase matching (by charge_id AND by email)
      const giftPurchaseByChargeId = new Map<string, any>();
      const giftPurchaseByEmail = new Map<string, any>();
      if (giftPurchases) {
        for (const purchase of giftPurchases) {
          // By charge ID (payment_intent_id or session_id)
          if (purchase.stripe_payment_intent_id) {
            giftPurchaseByChargeId.set(purchase.stripe_payment_intent_id, purchase);
          }
          if (purchase.stripe_session_id) {
            giftPurchaseByChargeId.set(purchase.stripe_session_id, purchase);
          }
          // By email (buyer_email)
          if (purchase.buyer_email) {
            giftPurchaseByEmail.set(purchase.buyer_email.toLowerCase(), purchase);
          }
        }
      }

      // Step C: Filter charges to only unmatched (email NOT in profiles) and mark gift purchases
      const stripeOnlyCharges: any[] = [];
      for (const charge of charges) {
        const chargeEmail = charge.email?.toLowerCase();
        if (chargeEmail && profileByEmail.has(chargeEmail)) {
          continue; // Person IS in our DB, skip
        }

        // Check if this is a gift purchase - by charge_id OR by email
        const giftPurchase = giftPurchaseByChargeId.get(charge.charge_id) 
          || (chargeEmail && giftPurchaseByEmail.get(chargeEmail));
        const chargeWithGiftFlag = {
          ...charge,
          is_gift_purchase: !!giftPurchase,
          buyer_email: giftPurchase?.buyer_email || null,
        };
        stripeOnlyCharges.push(chargeWithGiftFlag);
      }

      const total = stripeOnlyCharges.length;

      // Update job with results
      await supabaseAdmin
        .from("stripe_only_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          charges_json: stripeOnlyCharges,
          total,
        })
        .eq("id", job.id);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: `Processed ${total} unmatched charges`,
      });

    } catch (error: any) {
      await supabaseAdmin
        .from("stripe_only_jobs")
        .update({
          status: "failed",
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[process-stripe-only-jobs] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

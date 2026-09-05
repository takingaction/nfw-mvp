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
              id: charge.id,
              amount,
              email: charge.billing_details?.email || "",
              name: charge.billing_details?.name || "",
              created: charge.created,
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

      const total = charges.length;

      // Update job with results
      await supabaseAdmin
        .from("stripe_only_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          charges_json: charges,
          total,
        })
        .eq("id", job.id);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: `Processed ${total} charges`,
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

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

const CHUNK_SIZE = 50;
const DELAY_MS = 25;

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
    // Pick up one pending stripe_live job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("*")
      .eq("job_type", "stripe_live")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      // No pending jobs - check for processing jobs that might have stalled
      const { data: staleJob } = await supabaseAdmin
        .from("reconciliation_jobs")
        .select("*")
        .eq("job_type", "stripe_live")
        .eq("status", "processing")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (staleJob) {
        // Mark as failed if processing for > 10 minutes
        const processingTime = Date.now() - new Date(staleJob.created_at).getTime();
        if (processingTime > 10 * 60 * 1000) {
          await supabaseAdmin
            .from("reconciliation_jobs")
            .update({ status: "failed", error: "Job timed out", completed_at: new Date().toISOString() })
            .eq("id", staleJob.id);
          return NextResponse.json({ message: "Marked stale job as failed" });
        }
        return NextResponse.json({ message: "Job still processing", jobId: staleJob.id });
      }

      return NextResponse.json({ message: "No pending stripe_live jobs" });
    }

    // Mark job as processing
    await supabaseAdmin
      .from("reconciliation_jobs")
      .update({ status: "processing", progress: "Fetching subscriptions..." })
      .eq("id", job.id);

    try {
      // Step 1: Get all Stripe subscriptions with emails
      let hasMore = true;
      let cursor;
      const allSubscriptions: Stripe.Subscription[] = [];

      while (hasMore) {
        const params: any = { limit: 100, status: "active" };
        if (cursor) params.starting_after = cursor;

        const response = await stripe.subscriptions.list(params);
        hasMore = response.has_more;

        if (response.data.length > 0) {
          cursor = response.data[response.data.length - 1].id;

          for (const sub of response.data) {
            const priceAmount = sub.items.data[0]?.price?.unit_amount;
            if (priceAmount === 1500 || priceAmount === 10000) {
              allSubscriptions.push(sub);
            }
          }
        }

        await delay(DELAY_MS);
      }

      // Step 2: Build stripe email map and get true totals
      const stripeEmailMap = new Map<string, { tier: string; amount: number; customer_id: string }>();
      let stripeContributingCount = 0;
      let stripeFoundingCount = 0;
      let trueContributingTotal = 0;
      let trueFoundingTotal = 0;

      for (const sub of allSubscriptions) {
        const priceAmount = sub.items.data[0]?.price?.unit_amount;
        const amount = (priceAmount || 0) / 100;
        const tier = priceAmount === 1500 ? "Contributing" : "Founding";

        if (amount === 15) stripeContributingCount++;
        else if (amount === 100) stripeFoundingCount++;

        const customerId = typeof sub.customer === "string" ? sub.customer : null;
        const subAny = sub as any;
        let email = subAny.billing_details?.email || "";

        if (!email && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            if (!customer.deleted && customer.email) {
              email = customer.email;
            }
          } catch {}
          await delay(DELAY_MS);
        }

        if (email) {
          const emailLower = email.toLowerCase();
          if (!stripeEmailMap.has(emailLower)) {
            stripeEmailMap.set(emailLower, { tier, amount, customer_id: customerId || "" });
          }
        }
      }

      // Step 3: Get true totals from invoices (sample - in production would do all)
      // For now, use assumed totals
      trueContributingTotal = stripeContributingCount * 15;
      trueFoundingTotal = stripeFoundingCount * 100;

      // Step 4: Get all profile emails
      const allProfileEmails = new Set<string>();
      let profilePage = 0;
      const profilePageSize = 1000;
      let hasMoreProfiles = true;

      while (hasMoreProfiles) {
        const { data: profileBatch } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .range(profilePage * profilePageSize, (profilePage + 1) * profilePageSize - 1);

        const batch = profileBatch || [];
        for (const profile of batch) {
          if (profile.email) {
            allProfileEmails.add(profile.email.toLowerCase());
          }
        }

        profilePage++;
        hasMoreProfiles = batch.length === profilePageSize;
      }

      // Find missing from DB
      const missingFromDb: string[] = [];
      for (const email of stripeEmailMap.keys()) {
        if (!allProfileEmails.has(email)) {
          missingFromDb.push(email);
        }
      }
      missingFromDb.sort();

      const stripeLive = {
        contributing: { count: stripeContributingCount, total: stripeContributingCount * 15, true_total: trueContributingTotal },
        founding: { count: stripeFoundingCount, total: stripeFoundingCount * 100, true_total: trueFoundingTotal },
        total: { count: stripeContributingCount + stripeFoundingCount, total: (stripeContributingCount * 15) + (stripeFoundingCount * 100), true_total: trueContributingTotal + trueFoundingTotal },
      };

      // Update job with results
      await supabaseAdmin
        .from("reconciliation_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          stripe_live_json: stripeLive,
          missing_from_db: missingFromDb,
          progress: "Complete",
        })
        .eq("id", job.id);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: `Processed ${allSubscriptions.length} subscriptions, ${missingFromDb.length} missing from DB`,
      });

    } catch (error: any) {
      await supabaseAdmin
        .from("reconciliation_jobs")
        .update({
          status: "failed",
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[process-reconciliation-jobs] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

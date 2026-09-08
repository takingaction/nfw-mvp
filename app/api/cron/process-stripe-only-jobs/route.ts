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

const DELAY_MS = 50; // Small delay between API calls

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface StripeCharge {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  created: number;
  billing_details?: {
    email?: string | null;
    name?: string | null;
  };
}

async function processStripeOnlyJob(jobId: string): Promise<void> {
  console.log(`[process-stripe-only] Processing job ${jobId}`);

  try {
    // Update job status to processing
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({
        status: "processing",
        progress: "Loading profiles..."
      })
      .eq("id", jobId);

    // Step 1: Get ALL profile emails using pagination
    const allProfiles: any[] = [];
    let pageStart = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: profilesPage, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .range(pageStart, pageStart + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch profiles: ${error.message}`);
      }

      if (profilesPage && profilesPage.length > 0) {
        allProfiles.push(...profilesPage);
        pageStart += pageSize;
      }

      hasMore = profilesPage && profilesPage.length === pageSize;
    }

    // Build email → profile map (case-insensitive)
    const profileByEmail = new Map<string, any>();
    for (const profile of allProfiles) {
      if (profile.email) {
        profileByEmail.set(profile.email.toLowerCase(), profile);
      }
    }

    console.log(`[process-stripe-only] Profiles loaded: ${allProfiles.length}`);

    // Update progress
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({ progress: "Fetching Stripe subscriptions..." })
      .eq("id", jobId);

    // Step 2: Get ALL Stripe subscriptions with their customer IDs
    const allCustomerIds: string[] = [];
    const statuses: Array<"active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused"> =
      ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"];

    for (const status of statuses) {
      let subHasMore = true;
      let subCursor: string | undefined;
      let pageNum = 0;

      while (subHasMore) {
        pageNum++;
        try {
          const subParams: any = { limit: 100, status };
          if (subCursor) subParams.starting_after = subCursor;

          await sleep(200); // Delay between subscription list calls

          const subsResponse = await stripe.subscriptions.list(subParams as any);
          subHasMore = subsResponse.has_more;

          if (subsResponse.data.length > 0) {
            subCursor = subsResponse.data[subsResponse.data.length - 1].id;

            for (const sub of subsResponse.data) {
              if (sub.customer && !allCustomerIds.includes(sub.customer as string)) {
                allCustomerIds.push(sub.customer as string);
              }
            }
          }

          console.log(`[process-stripe-only] Status ${status}, page ${pageNum}: ${allCustomerIds.length} customers`);
        } catch (err: any) {
          console.error(`[process-stripe-only] Error listing subscriptions (${status}):`, err.message);
          subHasMore = false;
        }
      }
    }

    console.log(`[process-stripe-only] Total unique customers: ${allCustomerIds.length}`);

    // Update progress
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({ progress: `Processing ${allCustomerIds.length} customers...` })
      .eq("id", jobId);

    // Step 3: Fetch charges for each customer
    const allCharges: StripeCharge[] = [];
    const processedChargeIds = new Set<string>();

    // Target ~2 minutes total
    const TARGET_SECONDS = 120;
    const DELAY_BETWEEN_CUSTOMERS = Math.max(50, Math.floor((TARGET_SECONDS * 1000) / allCustomerIds.length));

    for (let i = 0; i < allCustomerIds.length; i++) {
      const customerId = allCustomerIds[i];
      const customerNum = i + 1;

      if (i > 0) {
        await sleep(DELAY_BETWEEN_CUSTOMERS);
      }

      try {
        const charges = await stripe.charges.list({
          customer: customerId,
          limit: 100,
        });

        for (const charge of charges.data) {
          // Only membership amounts ($15 = 1500, $100 = 10000)
          if ((charge.amount === 1500 || charge.amount === 10000) && !processedChargeIds.has(charge.id)) {
            processedChargeIds.add(charge.id);
            allCharges.push({
              id: charge.id,
              customer: charge.customer as string,
              amount: charge.amount,
              currency: charge.currency,
              created: charge.created,
              billing_details: charge.billing_details,
            });
          }
        }

        // Progress log every 25 customers
        if (customerNum % 25 === 0 || customerNum === allCustomerIds.length) {
          console.log(`[process-stripe-only] Processed ${customerNum}/${allCustomerIds.length}: ${allCharges.length} charges`);
          
          // Update progress in job
          await supabaseAdmin
            .from("stripe_only_jobs")
            .update({ 
              progress: `Processed ${customerNum}/${allCustomerIds.length} customers...`
            })
            .eq("id", jobId);
        }
      } catch (err: any) {
        console.warn(`[process-stripe-only] Error fetching charges for ${customerId}:`, err.message);
      }
    }

    console.log(`[process-stripe-only] Total charges: ${allCharges.length}`);

    // Update progress
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({ progress: "Finding Stripe-only charges..." })
      .eq("id", jobId);

    // Step 4: Find charges where email is NOT in our profiles
    const stripeOnlyCharges: any[] = [];
    let matchCount = 0;

    for (const charge of allCharges) {
      const chargeEmail = charge.billing_details?.email?.toLowerCase();

      if (chargeEmail && profileByEmail.has(chargeEmail)) {
        matchCount++;
        continue;
      }

      stripeOnlyCharges.push({
        charge_id: charge.id,
        customer_id: charge.customer,
        email: charge.billing_details?.email || null,
        name: charge.billing_details?.name || null,
        amount: charge.amount / 100,
        currency: charge.currency,
        created: new Date(charge.created * 1000).toISOString(),
      });
    }

    console.log(`[process-stripe-only] Matched: ${matchCount}, Stripe-only: ${stripeOnlyCharges.length}`);

    // Sort by date, newest first
    stripeOnlyCharges.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const total = stripeOnlyCharges.reduce((sum, c) => sum + c.amount, 0);

    // Step 5: Compute Duplicates in Stripe (emails with 2+ subscriptions)
    // We need to re-fetch subscriptions to build email → subs map
    const emailToSubs = new Map<string, any[]>();

    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({ progress: "Finding duplicates..." })
      .eq("id", jobId);

    for (const status of statuses) {
      let subHasMore = true;
      let subCursor: string | undefined;

      while (subHasMore) {
        try {
          const subParams: any = { limit: 100, status };
          if (subCursor) subParams.starting_after = subCursor;

          await sleep(200);

          const subsResponse = await stripe.subscriptions.list(subParams as any);
          subHasMore = subsResponse.has_more;

          if (subsResponse.data.length > 0) {
            subCursor = subsResponse.data[subsResponse.data.length - 1].id;

            for (const sub of subsResponse.data) {
              const subAny = sub as any;
              const email = (subAny.customer_email || "").toLowerCase();
              if (email) {
                if (!emailToSubs.has(email)) {
                  emailToSubs.set(email, []);
                }
                emailToSubs.get(email)!.push({
                  subscription_id: sub.id,
                  customer_id: sub.customer,
                  tier: sub.items.data[0]?.price?.unit_amount === 1500 ? "contributing" : "founding",
                  amount: (sub.items.data[0]?.price?.unit_amount || 0) / 100,
                  status: sub.status,
                  current_period_start: subAny.current_period_start,
                  current_period_end: subAny.current_period_end,
                });
              }
            }
          }
        } catch (err: any) {
          console.error(`[process-stripe-only] Error fetching subscriptions for duplicates:`, err.message);
          subHasMore = false;
        }
      }
    }

    const stripeDuplicates = [];
    for (const [email, subs] of emailToSubs.entries()) {
      if (subs.length > 1) {
        stripeDuplicates.push({ email, count: subs.length, subscriptions: subs });
      }
    }
    // Sort by count desc
    stripeDuplicates.sort((a, b) => b.count - a.count);

    console.log(`[process-stripe-only] Stripe duplicates: ${stripeDuplicates.length}`);

    // Step 6: Compute Duplicates (DB query - emails with 2+ entries in stripe_backfill_status)
    const { data: backfillRecords } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("email")
      .not("email", "is", null);

    const emailCount = new Map<string, number>();
    for (const record of backfillRecords || []) {
      const email = (record.email || "").toLowerCase();
      emailCount.set(email, (emailCount.get(email) || 0) + 1);
    }

    const duplicates = [];
    for (const [email, count] of emailCount.entries()) {
      if (count > 1) {
        duplicates.push({ email, count });
      }
    }
    duplicates.sort((a, b) => b.count - a.count);

    console.log(`[process-stripe-only] Duplicates: ${duplicates.length}`);

    // Step 7: Compute Missing from Backfill (profiles with stripe_customer_id but not in stripe_backfill_status)
    const { data: profilesWithStripe } = await supabaseAdmin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .not("stripe_customer_id", "is", null);

    const { data: backfillCustomerIds } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("stripe_customer_id")
      .not("stripe_customer_id", "is", null);

    const backfillCustomerIdSet = new Set((backfillCustomerIds || []).map((r: any) => r.stripe_customer_id));

    const missingFromBackfill = [];
    for (const profile of profilesWithStripe || []) {
      if (profile.stripe_customer_id && !backfillCustomerIdSet.has(profile.stripe_customer_id)) {
        missingFromBackfill.push({
          email: profile.email,
          stripe_customer_id: profile.stripe_customer_id,
        });
      }
    }
    missingFromBackfill.sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    console.log(`[process-stripe-only] Missing from backfill: ${missingFromBackfill.length}`);

    // Store results in job
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({
        status: "completed",
        progress: "Completed",
        completed_at: new Date().toISOString(),
        charges_json: stripeOnlyCharges,
        total: total,
        stripe_duplicates_json: stripeDuplicates,
        duplicates_json: duplicates,
        missing_from_backfill_json: missingFromBackfill,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour cache
      })
      .eq("id", jobId);

    console.log(`[process-stripe-only] Job ${jobId} completed: ${stripeOnlyCharges.length} charges, total $${total}`);

  } catch (error: any) {
    console.error(`[process-stripe-only] Error processing job ${jobId}:`, error);
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({
        status: "failed",
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-stripe-only] Starting stripe-only jobs processor...");

    // Find pending job
    const { data: job } = await supabaseAdmin
      .from("stripe_only_jobs")
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!job) {
      console.log("[process-stripe-only] No pending jobs found");
      return NextResponse.json({ success: true, message: "No pending jobs" });
    }

    await processStripeOnlyJob(job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "processed"
    });

  } catch (error: any) {
    console.error("[process-stripe-only] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process stripe-only jobs" },
      { status: 500 }
    );
  }
}

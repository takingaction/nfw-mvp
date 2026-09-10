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

const DELAY_MS = 50;
const CUSTOMERS_PER_RUN = 50; // Process 50 customers per cron run (~60 seconds)

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

interface ProgressData {
  // Phase 1: Profile loading
  profileEmails?: string[];
  // Phase 2: Customer enumeration  
  allCustomerIds?: string[];
  // Phase 2: Duplicate detection - collect subscription data once
  emailToSubs?: Array<{
    email: string;
    subscription_id: string;
    customer_id: string;
    tier: string;
    status: string;
  }>;
  // Phase 3: Charge collection
  allCharges?: StripeCharge[];
  processedChargeIds?: string[];
  // Phase 4: Results
  stripeOnlyCharges?: any[];
  stripeDuplicates?: any[];
  duplicates?: any[];
  missingFromBackfill?: any[];
  total?: number;
  matchCount?: number;
}

async function processJobChunk(jobId: string): Promise<{ done: boolean; phase: string }> {
  // Fetch current job state
  const { data: job } = await supabaseAdmin
    .from("stripe_only_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) {
    throw new Error("Job not found");
  }

  const currentPhase = job.current_phase || "pending";
  const progressData: ProgressData = job.progress_data || {};
  const processedCount = job.processed_count || 0;

  console.log(`[process-stripe-only] Phase: ${currentPhase}, Processed: ${processedCount}`);

  // ========== PHASE 1: Load profiles (one-time) ==========
  if (currentPhase === "pending" || !progressData.profileEmails) {
    console.log("[process-stripe-only] PHASE 1: Loading profiles...");
    
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

    // Build email set
    const profileEmails = new Set<string>();
    for (const profile of allProfiles) {
      if (profile.email) {
        profileEmails.add(profile.email.toLowerCase());
      }
    }

    console.log(`[process-stripe-only] Loaded ${allProfiles.length} profiles, ${profileEmails.size} emails`);

    // Move to phase 2
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({
        current_phase: "enum_customers",
        progress_data: { profileEmails: Array.from(profileEmails) },
        progress: "Enumerating Stripe customers...",
      })
      .eq("id", jobId);

    return { done: false, phase: "enum_customers" };
  }

  // ========== PHASE 2: Enumerate all Stripe customers ==========
  if (currentPhase === "enum_customers") {
    console.log("[process-stripe-only] PHASE 2: Enumerating Stripe customers...");
    
    const allCustomerIds: string[] = progressData.allCustomerIds || [];
    // Collect subscription data for duplicate detection (Phase 4 will reuse this)
    const emailToSubs: ProgressData["emailToSubs"] = progressData.emailToSubs || [];
    const statuses: Array<"active" | "past_due" | "canceled" | "unpaid" | "trialing" | "incomplete" | "incomplete_expired" | "paused"> =
      ["active", "past_due", "canceled", "unpaid", "trialing", "incomplete", "incomplete_expired", "paused"];

    // Find last processed status and cursor
    const lastStatus = job.last_processed_id?.split("|")[0] || statuses[0];
    const lastCursor = job.last_processed_id?.split("|")[1] || null;
    
    let foundResumePoint = false;
    let subHasMore = true;
    let subCursor: string | undefined = lastCursor || undefined;
    let pageNum = 0;
    let checkpointCounter = 0; // For more frequent checkpoints

    for (const status of statuses) {
      if (!foundResumePoint && status !== lastStatus) continue;
      if (foundResumePoint || status === lastStatus) foundResumePoint = true;

      while (subHasMore) {
        pageNum++;
        try {
          const subParams: any = { limit: 100, status };
          if (subCursor) subParams.starting_after = subCursor;

          await sleep(DELAY_MS); // 50ms instead of 200ms

          const subsResponse = await stripe.subscriptions.list(subParams as any);
          subHasMore = (subsResponse as any).has_more;

          if (subsResponse.data.length > 0) {
            subCursor = subsResponse.data[subsResponse.data.length - 1].id;

            for (const sub of subsResponse.data) {
              const customerId = sub.customer as string;
              if (customerId && !allCustomerIds.includes(customerId)) {
                allCustomerIds.push(customerId);
              }
              // Collect subscription data for Phase 4 duplicate detection
              const email = (sub as any).customer_email?.toLowerCase();
              if (email) {
                emailToSubs.push({
                  email,
                  subscription_id: sub.id,
                  customer_id: customerId,
                  tier: sub.items.data[0]?.price?.unit_amount === 1500 ? "contributing" : "founding",
                  status: sub.status,
                });
              }
            }
          }

          checkpointCounter++;
          console.log(`[process-stripe-only] Status ${status}, page ${pageNum}: ${allCustomerIds.length} customers, ${emailToSubs.length} subs`);

          // Save checkpoint every 25 API calls (not customers) for better resume granularity
          if (checkpointCounter % 25 === 0) {
            await supabaseAdmin
              .from("stripe_only_jobs")
              .update({
                progress_data: { ...progressData, allCustomerIds, emailToSubs },
                last_processed_id: `${status}|${subCursor}`,
                progress: `Found ${allCustomerIds.length} customers, ${emailToSubs.length} subscriptions...`,
              })
              .eq("id", jobId);
          }
        } catch (err: any) {
          console.error(`[process-stripe-only] Error listing subscriptions (${status}):`, err.message);
          subHasMore = false;
        }
      }
      
      subHasMore = true;
      subCursor = undefined;
    }

    console.log(`[process-stripe-only] Total unique customers: ${allCustomerIds.length}, subscriptions: ${emailToSubs.length}`);

    // Move to phase 3 (fetch charges) - pass emailToSubs for Phase 4 reuse
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({
        current_phase: "fetch_charges",
        progress_data: { 
          ...progressData, 
          allCustomerIds,
          emailToSubs,
          allCharges: [],
          processedChargeIds: [] 
        },
        processed_count: 0,
        total_count: allCustomerIds.length,
        last_processed_id: null,
        progress: `Fetching charges for ${allCustomerIds.length} customers...`,
      })
      .eq("id", jobId);

    return { done: false, phase: "fetch_charges" };
  }

  // ========== PHASE 3: Fetch charges for each customer ==========
  if (currentPhase === "fetch_charges") {
    console.log("[process-stripe-only] PHASE 3: Fetching charges...");
    
    const allCustomerIds: string[] = progressData.allCustomerIds || [];
    const allCharges: StripeCharge[] = progressData.allCharges || [];
    const processedChargeIds = new Set<string>(progressData.processedChargeIds || []);
    
    const startIndex = processedCount;
    const endIndex = Math.min(startIndex + CUSTOMERS_PER_RUN, allCustomerIds.length);
    
    console.log(`[process-stripe-only] Processing customers ${startIndex} to ${endIndex} of ${allCustomerIds.length}`);

    for (let i = startIndex; i < endIndex; i++) {
      const customerId = allCustomerIds[i];
      
      if (i > startIndex) {
        await sleep(DELAY_MS);
      }

      try {
        const charges = await stripe.charges.list({
          customer: customerId,
          limit: 100,
        });

        for (const charge of charges.data) {
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
      } catch (err: any) {
        console.warn(`[process-stripe-only] Error fetching charges for ${customerId}:`, err.message);
      }
    }

    const newProcessedCount = endIndex;
    const isDone = newProcessedCount >= allCustomerIds.length;

    if (isDone) {
      console.log(`[process-stripe-only] Charge fetching complete: ${allCharges.length} charges`);
      
      // Move to computing phase - pass emailToSubs for duplicate detection
      await supabaseAdmin
        .from("stripe_only_jobs")
        .update({
          current_phase: "computing",
          progress_data: { 
            ...progressData, 
            allCharges,
            processedChargeIds: Array.from(processedChargeIds)
          },
          processed_count: newProcessedCount,
          progress: "Computing results...",
        })
        .eq("id", jobId);

      return { done: false, phase: "computing" };
    } else {
      // Save checkpoint and let next cron run continue
      await supabaseAdmin
        .from("stripe_only_jobs")
        .update({
          processed_count: newProcessedCount,
          progress_data: { 
            ...progressData, 
            allCharges,
            processedChargeIds: Array.from(processedChargeIds)
          },
          progress: `Processed ${newProcessedCount}/${allCustomerIds.length} customers...`,
        })
        .eq("id", jobId);

      console.log(`[process-stripe-only] Checkpoint saved at ${newProcessedCount}/${allCustomerIds.length}`);
      return { done: false, phase: "fetch_charges" };
    }
  }

  // ========== PHASE 4: Compute results ==========
  if (currentPhase === "computing") {
    console.log("[process-stripe-only] PHASE 4: Computing results...");
    
    const allCharges: StripeCharge[] = progressData.allCharges || [];
    const profileEmails = new Set<string>(progressData.profileEmails || []);
    
    // Find charges where email is NOT in our profiles
    const stripeOnlyCharges: any[] = [];
    let matchCount = 0;

    for (const charge of allCharges) {
      const chargeEmail = charge.billing_details?.email?.toLowerCase();

      if (chargeEmail && profileEmails.has(chargeEmail)) {
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

    // Sort by date, newest first
    stripeOnlyCharges.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    const total = stripeOnlyCharges.reduce((sum, c) => sum + c.amount, 0);

    console.log(`[process-stripe-only] Matched: ${matchCount}, Stripe-only: ${stripeOnlyCharges.length}`);

    // Get Stripe duplicates from cached subscription data (reused from Phase 2)
    // emailToSubs was collected during Phase 2 enumeration - no need to re-fetch
    const cachedEmailToSubs: Array<{
      email: string;
      subscription_id: string;
      customer_id: string;
      tier: string;
      status: string;
    }> = progressData.emailToSubs || [];

    const emailToSubsMap = new Map<string, typeof cachedEmailToSubs>();
    for (const sub of cachedEmailToSubs) {
      if (!emailToSubsMap.has(sub.email)) {
        emailToSubsMap.set(sub.email, []);
      }
      emailToSubsMap.get(sub.email)!.push(sub);
    }

    const stripeDuplicates = [];
    for (const [email, subs] of emailToSubsMap.entries()) {
      if (subs.length > 1) {
        stripeDuplicates.push({ email, count: subs.length, subscriptions: subs });
      }
    }
    stripeDuplicates.sort((a, b) => b.count - a.count);

    // Get DB duplicates (emails with 2+ entries in stripe_backfill_status)
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

    // Get missing from backfill
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

    console.log(`[process-stripe-only] Stripe duplicates: ${stripeDuplicates.length}, DB duplicates: ${duplicates.length}, Missing: ${missingFromBackfill.length}`);

    // Store results
    await supabaseAdmin
      .from("stripe_only_jobs")
      .update({
        status: "completed",
        current_phase: "completed",
        progress: "Completed",
        completed_at: new Date().toISOString(),
        charges_json: stripeOnlyCharges,
        total: total,
        stripe_duplicates_json: stripeDuplicates,
        duplicates_json: duplicates,
        missing_from_backfill_json: missingFromBackfill,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        progress_data: null, // Clean up
      })
      .eq("id", jobId);

    console.log(`[process-stripe-only] Job ${jobId} completed`);
    return { done: true, phase: "completed" };
  }

  // Should not reach here
  return { done: true, phase: currentPhase };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-stripe-only] Starting stripe-only jobs processor...");

    // Mark stale processing jobs as failed (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabaseAdmin
      .from("stripe_only_jobs")
      .select("id")
      .eq("status", "processing")
      .lt("updated_at", thirtyMinutesAgo);

    if (staleJobs && staleJobs.length > 0) {
      console.log(`[process-stripe-only] Marking ${staleJobs.length} stale jobs as failed`);
      for (const stale of staleJobs) {
        await supabaseAdmin
          .from("stripe_only_jobs")
          .update({
            status: "failed",
            error: "Job timed out",
            completed_at: new Date().toISOString(),
          })
          .eq("id", stale.id);
      }
    }

    // Find pending or processing job
    const { data: job } = await supabaseAdmin
      .from("stripe_only_jobs")
      .select("id, status")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!job) {
      console.log("[process-stripe-only] No pending jobs found");
      return NextResponse.json({ success: true, message: "No pending jobs" });
    }

    console.log(`[process-stripe-only] Processing job ${job.id}`);
    
    // Ensure job is in processing state
    if (job.status === "pending") {
      await supabaseAdmin
        .from("stripe_only_jobs")
        .update({ status: "processing" })
        .eq("id", job.id);
    }

    const result = await processJobChunk(job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      phase: result.phase,
      done: result.done,
    });

  } catch (error: any) {
    console.error("[process-stripe-only] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process stripe-only jobs" },
      { status: 500 }
    );
  }
}

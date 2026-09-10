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

const DELAY_MS = 250;
const SUBS_PER_RUN = 50; // Process 50 subscriptions per cron run (~30-60 seconds)

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SubscriptionData {
  email: string;
  subscription_id: string;
  customer_id: string;
  tier: string;
  status: string;
  current_period_end: number;
}

interface DuplicateProgress {
  allEmails: string[];
  emailToSubs: SubscriptionData[];
  processedCount: number;
  lastCursor: string | null;
}

async function processJobChunk(jobId: string): Promise<{ done: boolean; phase: string }> {
  // Fetch current job state
  const { data: job } = await supabaseAdmin
    .from("stripe_duplicates_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) {
    throw new Error("Job not found");
  }

  const progressData: DuplicateProgress = job.progress_data || {};
  const processedCount = job.processed_count || 0;

  console.log(`[process-stripe-duplicates] Processed: ${processedCount}`);

  // ========== PHASE 1: Enumerate active subscriptions ==========
  if (!progressData.allEmails) {
    console.log("[process-stripe-duplicates] PHASE 1: Starting subscription enumeration...");
    
    await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .update({
        current_phase: "enum_subscriptions",
        progress_data: {
          allEmails: [],
          emailToSubs: [],
          processedCount: 0,
          lastCursor: null,
        },
        progress: "Enumerating active subscriptions...",
      })
      .eq("id", jobId);

    return { done: false, phase: "enum_subscriptions" };
  }

  // ========== PHASE 2: Enumerate active subscriptions (chunked) ==========
  if (job.current_phase === "enum_subscriptions") {
    console.log("[process-stripe-duplicates] PHASE 2: Enumerating subscriptions...");
    
    const allEmails: string[] = progressData.allEmails || [];
    const emailToSubs: SubscriptionData[] = progressData.emailToSubs || [];
    const lastCursor = progressData.lastCursor || null;
    
    let hasMore = true;
    let cursor: string | undefined = lastCursor || undefined;
    let pageNum = 0;
    let checkpointCounter = 0;

    while (hasMore && pageNum < SUBS_PER_RUN / 2) {
      pageNum++;
      try {
        const subParams: any = { limit: 100, status: "active" };
        if (cursor) subParams.starting_after = cursor;

        await sleep(DELAY_MS);

        const subsResponse = await stripe.subscriptions.list(subParams as any);
        hasMore = (subsResponse as any).has_more;

        if (subsResponse.data.length > 0) {
          cursor = subsResponse.data[subsResponse.data.length - 1].id;

          for (const sub of subsResponse.data) {
            const customerId = sub.customer as string;
            const email = (sub as any).customer_email?.toLowerCase();
            
            if (email) {
              if (!allEmails.includes(email)) {
                allEmails.push(email);
              }
              emailToSubs.push({
                email,
                subscription_id: sub.id,
                customer_id: customerId,
                tier: sub.items.data[0]?.price?.unit_amount === 1500 ? "contributing" : "founding",
                status: sub.status,
                current_period_end: (sub as any).current_period_end,
              });
            }
          }
        }

        checkpointCounter++;
        console.log(`[process-stripe-duplicates] Page ${pageNum}: ${allEmails.length} emails, ${emailToSubs.length} subs`);

        // Save checkpoint every 25 API calls
        if (checkpointCounter % 25 === 0) {
          await supabaseAdmin
            .from("stripe_duplicates_jobs")
            .update({
              progress_data: {
                allEmails,
                emailToSubs,
                processedCount: 0,
                lastCursor: cursor,
              },
              progress: `Found ${allEmails.length} emails, ${emailToSubs.length} subscriptions...`,
            })
            .eq("id", jobId);
        }
      } catch (err: any) {
        console.error(`[process-stripe-duplicates] Error listing subscriptions:`, err.message);
        hasMore = false;
      }
    }

    if (!hasMore) {
      // Move to computing phase
      console.log(`[process-stripe-duplicates] Subscription enumeration complete: ${allEmails.length} emails, ${emailToSubs.length} subs`);
      
      await supabaseAdmin
        .from("stripe_duplicates_jobs")
        .update({
          current_phase: "computing",
          progress_data: {
            allEmails,
            emailToSubs,
            processedCount: 0,
            lastCursor: null,
          },
          total_subscriptions: emailToSubs.length,
          progress: "Computing duplicates...",
        })
        .eq("id", jobId);

      return { done: false, phase: "computing" };
    } else {
      // Save checkpoint and let next cron run continue
      await supabaseAdmin
        .from("stripe_duplicates_jobs")
        .update({
          progress_data: {
            allEmails,
            emailToSubs,
            processedCount: 0,
            lastCursor: cursor,
          },
          progress: `Processed ${pageNum} pages, ${allEmails.length} emails found...`,
        })
        .eq("id", jobId);

      console.log(`[process-stripe-duplicates] Checkpoint saved at ${cursor}`);
      return { done: false, phase: "enum_subscriptions" };
    }
  }

  // ========== PHASE 3: Compute duplicates ==========
  if (job.current_phase === "computing") {
    console.log("[process-stripe-duplicates] PHASE 3: Computing duplicates...");
    
    const emailToSubs: SubscriptionData[] = progressData.emailToSubs || [];

    // Build email → subscriptions map
    const emailMap = new Map<string, SubscriptionData[]>();
    for (const sub of emailToSubs) {
      if (!emailMap.has(sub.email)) {
        emailMap.set(sub.email, []);
      }
      emailMap.get(sub.email)!.push(sub);
    }

    // Find duplicates (same email, multiple subscriptions)
    const duplicates = [];
    for (const [email, subs] of emailMap.entries()) {
      if (subs.length > 1) {
        duplicates.push({
          email,
          subscription_count: subs.length,
          subscriptions: subs.map(s => ({
            subscription_id: s.subscription_id,
            customer_id: s.customer_id,
            tier: s.tier,
            status: s.status,
            current_period_end: new Date(s.current_period_end * 1000).toISOString(),
          })),
        });
      }
    }

    // Sort by subscription count descending
    duplicates.sort((a, b) => b.subscription_count - a.subscription_count);

    console.log(`[process-stripe-duplicates] Found ${duplicates.length} emails with multiple subscriptions`);

    // Store results
    await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .update({
        status: "completed",
        current_phase: "completed",
        progress: "Completed",
        completed_at: new Date().toISOString(),
        duplicate_emails_count: duplicates.length,
        duplicates_json: duplicates,
      })
      .eq("id", jobId);

    console.log(`[process-stripe-duplicates] Job ${jobId} completed`);
    return { done: true, phase: "completed" };
  }

  // Should not reach here
  return { done: true, phase: job.current_phase };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-stripe-duplicates] Starting duplicates job processor...");

    // Mark stale processing jobs as failed (older than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .select("id")
      .eq("status", "processing")
      .lt("updated_at", thirtyMinutesAgo);

    if (staleJobs && staleJobs.length > 0) {
      console.log(`[process-stripe-duplicates] Marking ${staleJobs.length} stale jobs as failed`);
      for (const stale of staleJobs) {
        await supabaseAdmin
          .from("stripe_duplicates_jobs")
          .update({
            status: "failed",
            error: "Job timed out",
            completed_at: new Date().toISOString(),
          })
          .eq("id", stale.id);
      }
    }

    // Find pending job
    const { data: job } = await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .select("id, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!job) {
      console.log("[process-stripe-duplicates] No pending jobs found");
      return NextResponse.json({ success: true, message: "No pending jobs" });
    }

    console.log(`[process-stripe-duplicates] Processing job ${job.id}`);
    
    // Ensure job is in processing state
    if (job.status === "pending") {
      await supabaseAdmin
        .from("stripe_duplicates_jobs")
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
    console.error("[process-stripe-duplicates] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process duplicates jobs" },
      { status: 500 }
    );
  }
}

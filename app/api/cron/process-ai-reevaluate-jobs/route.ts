import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
// 2026-09 banner removal: without maxDuration, Vercel kills ticks at the
// default 10s while Claude is mid-call and the cursor never advances.
// Pair with the 250s self-budget so we always stop a few seconds before
// this ceiling and the DB write at the end actually flushes.
export const maxDuration = 300;

// Chunking settings
const GRANTS_PER_TICK = 25;          // Process 25 grants per cron tick (~5-30s of work)
const THROTTLE_MS = 200;             // 200ms between Claude calls — stays well under rate limit
const TIME_BUDGET_MS = 250_000;      // 250s — leaves 50s buffer for Vercel 300s limit

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Job {
  id: string;
  cycle_id: string;
  force_full: boolean;
  status: string;
  current_phase: string | null;
  processed_count: number;
  total_count: number;
  succeeded_count: number;
  failed_count: number;
  cycle_grants_json: string[] | null;
  last_processed_id: string | null;
  started_at: string | null;
}

async function processJobChunk(job: Job): Promise<{ done: boolean; phase: string }> {
  const cycleId = job.cycle_id;
  const phase = job.current_phase || "pending";

  // Skip if API key isn't configured (lib/anthropic.ts will return 'uncertain'
  // for every call which is useless work; just bail)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[process-ai-reevaluate] ANTHROPIC_API_KEY not configured, skipping");
    await supabaseAdmin
      .from("ai_reevaluate_jobs")
      .update({
        status: "failed",
        error_message: "ANTHROPIC_API_KEY not configured",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { done: true, phase: "failed" };
  }

  // Lazy import so missing SDK doesn't break the rest of the route
  const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
    "@/lib/anthropic"
  );

  // ========== PHASE 1: Enroll grants ==========
  if (phase === "pending" || !job.cycle_grants_json) {
    console.log(
      `[process-ai-reevaluate] PHASE 1: Enrolling grants for cycle ${cycleId} (force_full=${job.force_full})`,
    );

    let query = supabaseAdmin
      .from("grants")
      .select("id, ai_relevance")
      .eq("cycle_id", cycleId)
      .eq("status", "submitted");

    if (!job.force_full) {
      // Only re-evaluate apps that are not currently 'relevant' (matches
      // the original route's ?onlyNonRelevant=true default behavior).
      // 2026-09 banner removal: the simple `.neq("relevant")` excluded
      // NULL rows in Postgres, which left any grant still being processed
      // by the global cron untouched — silently widening the gap between
      // "Re-run AI Filter" and what the AI strip counted. Include NULL.
      query = query.or("ai_relevance.is.null,ai_relevance.neq.relevant");
    }

    const { data: grants, error } = await query;
    if (error) {
      console.error("[process-ai-reevaluate] Enroll query failed:", error);
      throw error;
    }

    const ids = (grants || []).map((g) => g.id);

    if (ids.length === 0) {
      console.log("[process-ai-reevaluate] No grants to re-evaluate");
      await supabaseAdmin
        .from("ai_reevaluate_jobs")
        .update({
          status: "completed",
          current_phase: "completed",
          total_count: 0,
          succeeded_count: 0,
          failed_count: 0,
          progress: "No grants needed re-evaluation",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          cycle_grants_json: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return { done: true, phase: "completed" };
    }

    await supabaseAdmin
      .from("ai_reevaluate_jobs")
      .update({
        status: "processing",
        current_phase: "evaluate",
        cycle_grants_json: ids,
        total_count: ids.length,
        processed_count: 0,
        succeeded_count: 0,
        failed_count: 0,
        progress: `Enrolled ${ids.length} grants. Starting evaluation...`,
        started_at: job.started_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { done: false, phase: "evaluate" };
  }

  // ========== PHASE 2: Evaluate (chunked) ==========
  if (phase === "evaluate") {
    const allIds = job.cycle_grants_json || [];
    const cursor = job.last_processed_id || null;
    const startIndex = cursor ? allIds.indexOf(cursor) + 1 : 0;
    const endIndex = Math.min(startIndex + GRANTS_PER_TICK, allIds.length);

    if (startIndex >= allIds.length) {
      // Done — mark completed
      console.log(
        `[process-ai-reevaluate] Job ${job.id} completed: ${job.succeeded_count}/${job.total_count} succeeded`,
      );
      await supabaseAdmin
        .from("ai_reevaluate_jobs")
        .update({
          status: "completed",
          current_phase: "completed",
          progress: `Completed: ${job.succeeded_count}/${job.total_count} (${job.failed_count} failed)`,
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          cycle_grants_json: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return { done: true, phase: "completed" };
    }

    // Fetch cycle name + description once per worker run (cheap to re-fetch
    // every tick since it's a single-row lookup, but we cache it locally for
    // the duration of this tick to avoid repeat reads within a single batch).
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name, description")
      .eq("id", cycleId)
      .single();

    const cycleName = cycle?.cycle_name || "";
    const cycleDescription = cycle?.description || "";

    // Fetch the slice of grants we need (with original ai_relevance so we can
    // preserve the "if reviewer already marked invalid, don't auto-restore"
    // behavior from the original route)
    const grantIds = allIds.slice(startIndex, endIndex);
    const { data: grants, error: fetchError } = await supabaseAdmin
      .from("grants")
      .select("id, who_are_you, biggest_challenge, fund_usage, ai_relevance, ai_invalidated_at")
      .in("id", grantIds);

    if (fetchError) {
      console.error("[process-ai-reevaluate] Grant fetch failed:", fetchError);
      throw fetchError;
    }

    const startTime = Date.now();
    let newSucceeded = job.succeeded_count;
    let newFailed = job.failed_count;
    let lastProcessed: string | null = cursor;
    let budgetReached = false;
    let processedThisTick = 0;
    const tickStart = startIndex;

    for (const g of grants || []) {
      try {
        // 2026-09 banner removal: skip-if-already-done guard. After
        // enrollment, the global ai-evaluate-pending cron or a sibling
        // worker may have already updated this row. Force Full should
        // re-run regardless, matching the old synchronous route's
        // behavior.
        if (
          !job.force_full &&
          g.ai_relevance === "relevant"
        ) {
          processedThisTick++;
          lastProcessed = g.id;
          await sleep(THROTTLE_MS);
          continue;
        }

        const result = await evaluateGrantApplication({
          cycleName,
          cycleDescription,
          whoAreYou: g.who_are_you || "",
          biggestChallenge: g.biggest_challenge || "",
          fundUsage: g.fund_usage || "",
        });

        // Mirror the original route's auto-restore rule:
        //   - If previously 'irrelevant' (auto-flagged), don't restore the
        //     reviewer skip — keep ai_invalidated_at intact
        //   - If reviewer already invalidated, preserve it (undefined keeps the
        //     existing value, which is the desired behavior)
        const wasPreviouslyIrrelevant = g.ai_relevance === "irrelevant";
        const reviewerAlreadyInvalidated = !!g.ai_invalidated_at;

        const updatePayload: Record<string, any> = {
          ai_relevance: result.relevance,
          ai_reasoning: result.reasoning,
          ai_evaluated_at: new Date().toISOString(),
          ai_model_version: result.model || AI_MODEL_VERSION,
        };

        if (wasPreviouslyIrrelevant && !reviewerAlreadyInvalidated) {
          // Was auto-flagged irrelevant; new eval says it's relevant — restore.
          updatePayload.ai_invalidated_at = null;
          updatePayload.ai_invalidated_by = null;
        }
        // else: leave ai_invalidated_at alone (reviewer decision is sticky)

        await supabaseAdmin
          .from("grants")
          .update(updatePayload)
          .eq("id", g.id);
        newSucceeded++;
      } catch (err: any) {
        console.error(
          `[process-ai-reevaluate] AI eval failed for grant ${g.id}:`,
          err?.message || err,
        );
        newFailed++;
      }
      processedThisTick++;
      lastProcessed = g.id;

      // 2026-09 banner removal: persist progress after every grant so a
      // Vercel kill mid-tick doesn't lose the cursor and force the next
      // tick to re-run everything from the same slice.
      const newProcessedCount = tickStart + processedThisTick;
      await supabaseAdmin
        .from("ai_reevaluate_jobs")
        .update({
          processed_count: newProcessedCount,
          last_processed_id: lastProcessed,
          succeeded_count: newSucceeded,
          failed_count: newFailed,
          progress: `Processed ${newProcessedCount}/${job.total_count}...`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      // Time budget check
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.log(
          `[process-ai-reevaluate] Time budget reached after processing ${processedThisTick} in this tick`,
        );
        budgetReached = true;
        break;
      }

      // Throttle between calls
      await sleep(THROTTLE_MS);
    }

    const newProcessedCount = tickStart + processedThisTick;
    const isDone = newProcessedCount >= allIds.length && !budgetReached;

    if (isDone) {
      await supabaseAdmin
        .from("ai_reevaluate_jobs")
        .update({
          processed_count: newProcessedCount,
          last_processed_id: lastProcessed,
          succeeded_count: newSucceeded,
          failed_count: newFailed,
          progress: `Completed: ${newSucceeded}/${job.total_count} (${newFailed} failed)`,
          status: "completed",
          current_phase: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          cycle_grants_json: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return { done: true, phase: "completed" };
    }

    return { done: false, phase: "evaluate" };
  }

  return { done: true, phase };
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[process-ai-reevaluate] Starting processor...");

    // Mark stale processing rows as failed (older than 30 minutes). Same
    // heuristic as the other job workers — a worker that's been "processing"
    // for 30+ min either crashed or got killed mid-run, and we want to let
    // a fresh attempt take over.
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabaseAdmin
      .from("ai_reevaluate_jobs")
      .select("id")
      .eq("status", "processing")
      .lt("updated_at", thirtyMinutesAgo);

    if (staleJobs && staleJobs.length > 0) {
      console.log(
        `[process-ai-reevaluate] Marking ${staleJobs.length} stale jobs as failed`,
      );
      for (const stale of staleJobs) {
        await supabaseAdmin
          .from("ai_reevaluate_jobs")
          .update({
            status: "failed",
            error_message: "Job timed out (no progress for 30 minutes)",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", stale.id);
      }
    }

    // Pull oldest pending|processing job (FIFO across cycles)
    const { data: job, error: jobError } = await supabaseAdmin
      .from("ai_reevaluate_jobs")
      .select("*")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw jobError;
    }

    if (!job) {
      return NextResponse.json({
        success: true,
        message: "No pending or processing jobs",
      });
    }

    console.log(`[process-ai-reevaluate] Processing job ${job.id} (phase=${job.current_phase || "pending"})`);

    // Ensure job is in processing state if it was pending
    if (job.status === "pending") {
      await supabaseAdmin
        .from("ai_reevaluate_jobs")
        .update({
          status: "processing",
          started_at: job.started_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    const result = await processJobChunk(job as Job);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      phase: result.phase,
      done: result.done,
    });
  } catch (error: any) {
    console.error("[process-ai-reevaluate] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process ai-reevaluate jobs" },
      { status: 500 },
    );
  }
}

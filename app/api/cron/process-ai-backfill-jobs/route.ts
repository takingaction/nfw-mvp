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

const GRANTS_PER_TICK = 25;
const THROTTLE_MS = 200;
const TIME_BUDGET_MS = 250_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Job {
  id: string;
  cycle_id: string;
  status: string;
  current_phase: string | null;
  processed_count: number;
  total_count: number;
  succeeded_count: number;
  failed_count: number;
  grant_ids_json: string[] | null;
  last_processed_id: string | null;
  started_at: string | null;
}

/**
 * Persist per-grant progress so a Vercel kill mid-tick doesn't lose the
 * cursor and force the next tick to re-run everything. Cheap (one COUNT
 * against a single id), and essential for long-running batches.
 */
async function persistProgress(
  jobId: string,
  payload: {
    processed_count: number;
    succeeded_count: number;
    failed_count: number;
    last_processed_id: string | null;
    progress: string;
    completed?: Record<string, unknown>;
  },
): Promise<void> {
  const { completed, ...rest } = payload;
  await supabaseAdmin
    .from("ai_backfill_jobs")
    .update({
      ...rest,
      ...(completed ?? {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function processJobChunk(
  job: Job,
): Promise<{ done: boolean; phase: string }> {
  const cycleId = job.cycle_id;
  const phase = job.current_phase || "pending";

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      "[process-ai-backfill] ANTHROPIC_API_KEY not configured, skipping",
    );
    await persistProgress(job.id, {
      processed_count: job.processed_count,
      succeeded_count: job.succeeded_count,
      failed_count: job.failed_count,
      last_processed_id: job.last_processed_id,
      progress: "ANTHROPIC_API_KEY not configured",
      completed: {
        status: "failed",
        error_message: "ANTHROPIC_API_KEY not configured",
        completed_at: new Date().toISOString(),
      },
    });
    return { done: true, phase: "failed" };
  }

  const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
    "@/lib/anthropic"
  );

  // ========== PHASE 1: Enroll grants ==========
  if (phase === "pending" || !job.grant_ids_json) {
    console.log(
      `[process-ai-backfill] PHASE 1: Enrolling unevaluated grants for cycle ${cycleId}`,
    );

    const { data: grants, error } = await supabaseAdmin
      .from("grants")
      .select("id")
      .eq("cycle_id", cycleId)
      .eq("status", "submitted")
      .or("ai_relevance.is.null,ai_relevance.eq.not_evaluated");

    if (error) {
      console.error("[process-ai-backfill] Enroll query failed:", error);
      throw error;
    }

    const ids = (grants || []).map((g) => g.id);

    if (ids.length === 0) {
      console.log("[process-ai-backfill] No grants need AI evaluation");
      await persistProgress(job.id, {
        processed_count: 0,
        succeeded_count: 0,
        failed_count: 0,
        last_processed_id: null,
        progress: "No grants needed evaluation",
        completed: {
          status: "completed",
          current_phase: "completed",
          total_count: 0,
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          grant_ids_json: null,
        },
      });
      return { done: true, phase: "completed" };
    }

    await persistProgress(job.id, {
      processed_count: 0,
      succeeded_count: 0,
      failed_count: 0,
      last_processed_id: ids[0] ?? null,
      progress: `Enrolled ${ids.length} grants. Starting evaluation...`,
      completed: {
        status: "processing",
        current_phase: "evaluate",
        grant_ids_json: ids,
        total_count: ids.length,
        started_at: job.started_at || new Date().toISOString(),
      },
    });

    return { done: false, phase: "evaluate" };
  }

  // ========== PHASE 2: Evaluate (chunked) ==========
  if (phase === "evaluate") {
    const allIds = job.grant_ids_json || [];
    const cursor = job.last_processed_id || null;
    const startIndex = cursor ? allIds.indexOf(cursor) + 1 : 0;
    const endIndex = Math.min(startIndex + GRANTS_PER_TICK, allIds.length);

    if (startIndex >= allIds.length) {
      console.log(
        `[process-ai-backfill] Job ${job.id} completed: ${job.succeeded_count}/${job.total_count} succeeded`,
      );
      await persistProgress(job.id, {
        processed_count: job.processed_count,
        succeeded_count: job.succeeded_count,
        failed_count: job.failed_count,
        last_processed_id: job.last_processed_id,
        progress: `Completed: ${job.succeeded_count}/${job.total_count} (${job.failed_count} failed)`,
        completed: {
          status: "completed",
          current_phase: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          grant_ids_json: null,
        },
      });
      return { done: true, phase: "completed" };
    }

    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name, description")
      .eq("id", cycleId)
      .single();

    const cycleName = cycle?.cycle_name || "";
    const cycleDescription = cycle?.description || "";

    const grantIds = allIds.slice(startIndex, endIndex);
    const { data: grants, error: fetchError } = await supabaseAdmin
      .from("grants")
      .select("id, who_are_you, biggest_challenge, fund_usage, ai_relevance")
      .in("id", grantIds);

    if (fetchError) {
      console.error("[process-ai-backfill] Grant fetch failed:", fetchError);
      throw fetchError;
    }

    const startTime = Date.now();
    let newSucceeded = job.succeeded_count;
    let newFailed = job.failed_count;
    let lastProcessed: string | null = cursor;
    let processedThisTick = 0;
    let budgetReached = false;

    // Track where we are in `grants` (the chunk we just fetched) so the
    // "processed_this_tick" count is honest even when we exit mid-tick.
    const tickStart = startIndex;
    let tickIndex = 0;

    for (const g of grants || []) {
      tickIndex++;
      try {
        // 2026-09 banner removal: skip-if-already-done guard. We re-read
        // ai_relevance inside the chunk because submit-time AI eval or
        // the global ai-evaluate-pending cron may have already covered
        // this grant between enrollment and the actual Claude call.
        // Backfill scope is "not in (NULL, 'not_evaluated')" — skip if
        // the row already has a real status.
        if (
          g.ai_relevance &&
          g.ai_relevance !== "not_evaluated"
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
        await supabaseAdmin
          .from("grants")
          .update({
            ai_relevance: result.relevance,
            ai_reasoning: result.reasoning,
            ai_evaluated_at: new Date().toISOString(),
            ai_model_version: result.model || AI_MODEL_VERSION,
          })
          .eq("id", g.id);
        newSucceeded++;
      } catch (err: any) {
        console.error(
          `[process-ai-backfill] AI eval failed for grant ${g.id}:`,
          err?.message || err,
        );
        newFailed++;
      }
      processedThisTick++;
      lastProcessed = g.id;

      // Persist progress per grant so a Vercel kill mid-tick keeps the
      // cursor honest and the next tick picks up correctly.
      const newProcessedCount = tickStart + processedThisTick;
      await persistProgress(job.id, {
        processed_count: newProcessedCount,
        succeeded_count: newSucceeded,
        failed_count: newFailed,
        last_processed_id: lastProcessed,
        progress: `Processed ${newProcessedCount}/${job.total_count}...`,
      });

      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.log(
          `[process-ai-backfill] Time budget reached after processing ${processedThisTick} in this tick`,
        );
        budgetReached = true;
        break;
      }

      await sleep(THROTTLE_MS);
    }

    const newProcessedCount = tickStart + processedThisTick;
    const isDone = newProcessedCount >= allIds.length && !budgetReached;

    if (isDone) {
      await persistProgress(job.id, {
        processed_count: newProcessedCount,
        succeeded_count: newSucceeded,
        failed_count: newFailed,
        last_processed_id: lastProcessed,
        progress: `Completed: ${newSucceeded}/${job.total_count} (${newFailed} failed)`,
        completed: {
          status: "completed",
          current_phase: "completed",
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          grant_ids_json: null,
        },
      });
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

    console.log("[process-ai-backfill] Starting processor...");

    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000,
    ).toISOString();
    const { data: staleJobs } = await supabaseAdmin
      .from("ai_backfill_jobs")
      .select("id")
      .eq("status", "processing")
      .lt("updated_at", thirtyMinutesAgo);

    if (staleJobs && staleJobs.length > 0) {
      console.log(
        `[process-ai-backfill] Marking ${staleJobs.length} stale jobs as failed`,
      );
      for (const stale of staleJobs) {
        await supabaseAdmin
          .from("ai_backfill_jobs")
          .update({
            status: "failed",
            error_message: "Job timed out (no progress for 30 minutes)",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", stale.id);
      }
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("ai_backfill_jobs")
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

    console.log(
      `[process-ai-backfill] Processing job ${job.id} (phase=${job.current_phase || "pending"})`,
    );

    if (job.status === "pending") {
      await supabaseAdmin
        .from("ai_backfill_jobs")
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
    console.error("[process-ai-backfill] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process ai-backfill jobs" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Background worker that drains grant_ai_eval_queue.
 *
 * Created 2026-09-21: replaces the inline Anthropic call inside
 * app/api/grants/create/route.ts so the user's submission response can
 * never be aborted by an in-flight AI evaluation.
 *
 * Schedule: every 2 minutes via vercel.json.
 *
 * Pattern matches the other cron workers in this repo:
 *  - CRON_SECRET Bearer auth
 *  - supabaseAdmin (bypasses RLS) for all writes
 *  - maxDuration=120, time budget = 100s (leaves headroom)
 *  - Stale-job recovery for any "processing" row older than 5 min
 *  - Atomic claim via UPDATE ... WHERE status='pending'
 *
 * Failed rows are not retried in this worker; that's a future ticket.
 * Today the existing app/api/cron/ai-evaluate-pending worker handles
 * backwards-compat rows (NULL ai_relevance) by scanning the grants
 * table directly.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const TIME_BUDGET_MS = 100_000;
const THROTTLE_MS = 200;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function claimOne(): Promise<
  { id: string; grant_id: string; cycle_id: string; attempts: number } | null
> {
  // Atomic: only the first concurrent call wins the row.
  const { data: rows, error: pickErr } = await supabaseAdmin
    .from("grant_ai_eval_queue")
    .select("id")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(1);

  if (pickErr) {
    console.error("[process-ai-eval-queue] pick error:", pickErr);
    return null;
  }
  const target = rows?.[0];
  if (!target) return null;

  const { data: claimed, error: updateErr } = await supabaseAdmin
    .from("grant_ai_eval_queue")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", target.id)
    .eq("status", "pending")
    .select("id, grant_id, cycle_id, attempts")
    .single();

  if (updateErr || !claimed) {
    // Another worker beat us, or the row vanished. Try again next tick.
    return null;
  }
  return claimed;
}

async function processJob(
  job: { id: string; grant_id: string; cycle_id: string; attempts: number },
  evaluateGrantApplication: any,
  AI_MODEL_VERSION: string,
): Promise<"completed" | "failed"> {
  // Look up the grant for evaluation input
  const { data: grant, error: grantErr } = await supabaseAdmin
    .from("grants")
    .select("id, who_are_you, biggest_challenge, fund_usage")
    .eq("id", job.grant_id)
    .single();

  if (grantErr || !grant) {
    throw new Error(`grant lookup failed: ${grantErr?.message ?? "no row"}`);
  }

  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from("grant_cycles")
    .select("cycle_name, description")
    .eq("id", job.cycle_id)
    .single();

  if (cycleErr || !cycle) {
    // Cycle was deleted; mark this row completed so we don't loop.
    // (We can't evaluate without the grant's purpose.)
    await supabaseAdmin
      .from("grant_ai_eval_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_error: "cycle missing or deleted",
      })
      .eq("id", job.id);
    return "completed";
  }

  // Evaluate
  const result = await evaluateGrantApplication({
    cycleName: cycle.cycle_name || "",
    cycleDescription: cycle.description || "",
    whoAreYou: grant.who_are_you || "",
    biggestChallenge: grant.biggest_challenge || "",
    fundUsage: grant.fund_usage || "",
  });

  // Persist to grants
  const { error: persistErr } = await supabaseAdmin
    .from("grants")
    .update({
      ai_relevance: result.relevance,
      ai_reasoning: result.reasoning,
      ai_evaluated_at: new Date().toISOString(),
      ai_model_version: result.model || AI_MODEL_VERSION,
    })
    .eq("id", job.grant_id);

  if (persistErr) {
    throw new Error(`grants update failed: ${persistErr.message}`);
  }

  await supabaseAdmin
    .from("grant_ai_eval_queue")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return "completed";
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { message: "ANTHROPIC_API_KEY not configured, skipping" },
      { status: 200 },
    );
  }

  // Lazy import — same pattern as lib/anthropic.ts so a missing SDK
  // doesn't break the route itself.
  const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
    "@/lib/anthropic"
  );

  const startTime = Date.now();
  let succeeded = 0;
  let failed = 0;

  // Stale-recovery: any "processing" row older than STALE_PROCESSING_MS
  // is bumped back to pending so we retry it. Runs once at the top.
  await supabaseAdmin
    .from("grant_ai_eval_queue")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt(
      "started_at",
      new Date(Date.now() - STALE_PROCESSING_MS).toISOString(),
    );

  while (Date.now() - startTime < TIME_BUDGET_MS) {
    const job = await claimOne();
    if (!job) break;

    try {
      const outcome = await processJob(job, evaluateGrantApplication, AI_MODEL_VERSION);
      if (outcome === "completed") succeeded++;
    } catch (err: any) {
      console.error(
        `[process-ai-eval-queue] job ${job.id} failed:`,
        err?.message ?? err,
      );
      // Mark this row failed, do NOT loop forever on it.
      // Future ticket: implement retry policy for transient errors.
      await supabaseAdmin
        .from("grant_ai_eval_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          last_error: String(err?.message ?? err).substring(0, 500),
          attempts: job.attempts + 1,
        })
        .eq("id", job.id);
      failed++;
    }

    await sleep(THROTTLE_MS);
  }

  return NextResponse.json({
    success: true,
    succeeded,
    failed,
    elapsedMs: Date.now() - startTime,
  });
}

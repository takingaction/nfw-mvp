import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/grants/[id]/ai-backfill
 *
 * Trigger-only: race-guarded job creation. The actual Claude calls happen
 * in /api/cron/process-ai-backfill-jobs.
 *
 * Preserves the original guard: refuses if grant_cycles.scoring_started_at
 * is NULL (i.e. Start Scoring hasn't been clicked for this cycle).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, scoring_started_at")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    if (!cycle.scoring_started_at) {
      return NextResponse.json(
        {
          error:
            "Start Scoring has not been clicked yet. Click Start Scoring first, then run AI backfill.",
        },
        { status: 400 },
      );
    }

    // Race guard
    const { data: existing } = await supabaseAdmin
      .from("ai_backfill_jobs")
      .select("id, status, created_at")
      .eq("cycle_id", cycleId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        jobId: existing.id,
        status: existing.status,
        message:
          "A backfill job is already running for this cycle. Polling existing job.",
      });
    }

    const { data: job, error } = await supabaseAdmin
      .from("ai_backfill_jobs")
      .insert({
        cycle_id: cycleId,
        status: "pending",
        progress: "Queued — backfill will run on the next cron tick",
      })
      .select("id, status")
      .single();

    if (error || !job) {
      console.error("[ai-backfill] Failed to create job:", error);
      return NextResponse.json(
        { error: "Failed to create backfill job" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      message:
        "Job created. Processing will happen on the next cron run (within 5 minutes).",
    });
  } catch (err: any) {
    console.error("[ai-backfill] POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/grants/[id]/ai-backfill
 *
 * Returns either the in-flight job state (?jobId=…) or the most recent
 * non-expired completed job for this cycle.
 *
 * Side note: this endpoint is also called by the cycle detail page on mount
 * to display the current backfill count. That existing behavior is preserved
 * by returning the most recent completed job's counts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (jobId) {
      const { data: job } = await supabaseAdmin
        .from("ai_backfill_jobs")
        .select(
          "id, status, current_phase, processed_count, total_count, succeeded_count, failed_count, progress, error_message, completed_at, expires_at",
        )
        .eq("id", jobId)
        .eq("cycle_id", cycleId)
        .maybeSingle();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        phase: job.current_phase,
        processed: job.processed_count,
        total: job.total_count,
        succeeded: job.succeeded_count,
        failed: job.failed_count,
        progress: job.progress,
        error: job.error_message,
        completedAt: job.completed_at,
      });
    }

    // No jobId — return current unevaluated count + the most recent
    // non-expired completed job for context. The cycle detail page reads
    // unevaluatedCount to drive the badge; clients that just want job
    // progress should pass ?jobId=…
    const { count, error: countError } = await supabaseAdmin
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .eq("status", "submitted")
      .or("ai_relevance.is.null,ai_relevance.eq.not_evaluated");

    if (countError) {
      console.error("[ai-backfill] Count query failed:", countError);
      return NextResponse.json(
        { error: "Failed to fetch unevaluated count" },
        { status: 500 },
      );
    }

    const unevaluatedCount = count ?? 0;

    // Look up the most recent pending|processing|non-expired-completed job
    // for context — clients may want to know if a job is currently running
    const { data: latest } = await supabaseAdmin
      .from("ai_backfill_jobs")
      .select(
        "id, status, processed_count, total_count, succeeded_count, failed_count, completed_at, expires_at",
      )
      .eq("cycle_id", cycleId)
      .in("status", ["pending", "processing", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      return NextResponse.json({
        jobId: null,
        status: "no_jobs",
        unevaluatedCount,
      });
    }

    const isExpired =
      latest.status === "completed" &&
      latest.expires_at &&
      new Date(latest.expires_at) < new Date();

    return NextResponse.json({
      jobId: latest.id,
      status: latest.status,
      processed: latest.processed_count,
      total: latest.total_count,
      succeeded: latest.succeeded_count,
      failed: latest.failed_count,
      completedAt: latest.completed_at,
      isExpired,
      unevaluatedCount,
    });
  } catch (err: any) {
    console.error("[ai-backfill] GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

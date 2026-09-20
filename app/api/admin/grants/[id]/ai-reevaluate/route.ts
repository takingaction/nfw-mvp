import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/grants/[id]/ai-reevaluate
 *
 * Trigger-only: race-guarded job creation. Returns immediately.
 * The actual Claude calls happen in /api/cron/process-ai-reevaluate-jobs.
 *
 * Body: { force_full?: boolean }  (default false, mirrors ?onlyNonRelevant=false)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    let forceFull = false;
    try {
      const body = await request.json().catch(() => ({}));
      forceFull = Boolean(body?.force_full);
    } catch {
      forceFull = false;
    }

    // Confirm the cycle exists so we don't accumulate orphaned job rows
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("id")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    // Race guard: if a pending|processing job exists for this cycle, return
    // its id so multiple admin clicks dedupe to the same job. The UI polls
    // that jobId and reflects the in-flight progress.
    const { data: existing } = await supabaseAdmin
      .from("ai_reevaluate_jobs")
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
          "A re-evaluate job is already running for this cycle. Polling existing job.",
      });
    }

    // Otherwise create a fresh pending job for the cron worker to pick up.
    const { data: job, error } = await supabaseAdmin
      .from("ai_reevaluate_jobs")
      .insert({
        cycle_id: cycleId,
        force_full: forceFull,
        status: "pending",
        progress: forceFull
          ? "Queued — force re-evaluation of all submitted grants"
          : "Queued — re-evaluating non-relevant grants",
      })
      .select("id, status")
      .single();

    if (error || !job) {
      console.error("[ai-reevaluate] Failed to create job:", error);
      return NextResponse.json(
        { error: "Failed to create re-evaluate job" },
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
    console.error("[ai-reevaluate] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/grants/[id]/ai-reevaluate?jobId=…
 *
 * Returns job status for client polling.
 * Without ?jobId, returns the most recent non-expired completed job so the
 * page can render instantly without firing any work.
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
        .from("ai_reevaluate_jobs")
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

    // No jobId — return the most recent non-expired job for this cycle.
    // Includes pending|processing so the page can detect an in-flight cron
    // job on mount and gate the button. Completed-only would miss that
    // case and let the admin click "Re-run AI Filter" thinking nothing is
    // running, when actually the cron worker is mid-tick.
    const { data: latest } = await supabaseAdmin
      .from("ai_reevaluate_jobs")
      .select(
        "id, status, force_full, processed_count, total_count, succeeded_count, failed_count, completed_at, expires_at",
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
        message: "No jobs found",
      });
    }

    const isExpired =
      latest.status === "completed" &&
      latest.expires_at &&
      new Date(latest.expires_at) < new Date();

    return NextResponse.json({
      jobId: latest.id,
      status: latest.status,
      forceFull: latest.force_full,
      processed: latest.processed_count,
      total: latest.total_count,
      succeeded: latest.succeeded_count,
      failed: latest.failed_count,
      completedAt: latest.completed_at,
      isExpired,
    });
  } catch (err: any) {
    console.error("[ai-reevaluate] GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

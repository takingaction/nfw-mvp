import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * /api/admin/backfill/stripe/missing-payments
 *
 * POST: create a job row for the cron worker to pick up.
 *   Returns { jobId, status }.
 *   If a pending/processing job already exists, returns its id (no duplicate).
 *
 * GET without jobId: return the most recent COMPLETED job that hasn't expired.
 *   Used by /admin/backfill/stripe page mount to render from cache.
 *   Returns { status: "none" } if no valid cache exists.
 *
 * GET ?jobId=X: return the row for polling.
 *   Used by the client while a job is running.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if there's already a pending/processing job; reuse it.
    const { data: existingJob } = await supabaseAdmin
      .from("missing_payments_jobs")
      .select("id, status, created_at")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        message: "A job is already running. Poll the status endpoint.",
      });
    }

    const { data: job, error } = await supabaseAdmin
      .from("missing_payments_jobs")
      .insert({ status: "pending", triggered_by: "admin" })
      .select("id")
      .single();

    if (error || !job) {
      // Map Postgres error codes to actionable messages so admins (and Slack
      // alerts) don't have to spelunk Vercel logs for every INSERT failure.
      console.error("[missing-payments] Failed to create job:", error);
      const code = (error as { code?: string } | null)?.code;
      const details = (error as { message?: string } | null)?.message;
      let message = "Failed to create job";
      if (!code) {
        // Supabase JS client throws plain Error objects (no .code) for
        // network/auth/SDK-init failures. Don't surface the misleading
        // "Failed to create job" verbatim — tell the admin it's transient.
        message = "Transient Supabase error — please try again in a moment";
      } else if (code === "42P01") {
        message = "Database table missing — run migration 174";
      } else if (code === "PGRST205") {
        // PostgREST schema cache references a table that doesn't exist on
        // the DB. Surface the missing table name from the error message so
        // the admin knows exactly which migration to run.
        const missing = details?.match(/'([^']+)'/)?.[1];
        message = missing
          ? `PostgREST schema cache stale — table ${missing} not found on DB. Run the matching migration in Supabase SQL Editor, then \`NOTIFY pgrst, 'reload';\``
          : "PostgREST schema cache stale — run `NOTIFY pgrst, 'reload';` in Supabase SQL Editor";
      } else if (code === "23505") {
        message = "A pending job already exists (race with cron auto-create) — refresh and retry";
      } else if (code === "42501") {
        message = "Service role key lacks insert permission — check SUPABASE_SERVICE_ROLE_KEY";
      } else if (code === "08006" || code === "40001") {
        // 08006 = connection_failure, 40001 = serialization_failure (deadlock).
        message = "Supabase connection issue — please try again in a moment";
      } else {
        // Unmapped Postgres code — surface it so future diagnostics don't
        // require another round of "Failed to create job" spelunking.
        message = `Failed to create job (code: ${code})`;
      }
      return NextResponse.json(
        { error: message, code: code || "UNKNOWN", details },
        { status: 500 },
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: "pending",
      message: "Job created. Processing happens on next cron run.",
    });
  } catch (error: any) {
    console.error("[missing-payments] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    // ----- Poll specific job -----
    if (jobId) {
      const { data: job } = await supabaseAdmin
        .from("missing_payments_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json(buildJobResponse(job));
    }

    // ----- Read latest non-expired completed cache -----
    const { data: latestJob } = await supabaseAdmin
      .from("missing_payments_jobs")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestJob) {
      return NextResponse.json({
        status: "none",
        message: "No completed jobs yet. Click Refresh Missing Payments to compute.",
      });
    }

    // expires_at is null OR > now() → still valid
    const expiresAt = latestJob.expires_at ? new Date(latestJob.expires_at) : null;
    if (expiresAt && expiresAt <= new Date()) {
      return NextResponse.json({
        status: "expired",
        message: "Cached result is older than 24 hours. Click Refresh Missing Payments to recompute.",
        lastCompletedAt: latestJob.completed_at,
      });
    }

    return NextResponse.json({
      ...buildJobResponse(latestJob),
      cached: true,
    });
  } catch (error: any) {
    console.error("[missing-payments] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Shape the DB row into the response the client already understands
 * (matches the previous synchronous route's payload so the existing
 * `missingPayments` state in BackfillClient.tsx keeps working).
 */
function buildJobResponse(job: any) {
  return {
    jobId: job.id,
    status: job.status,
    triggeredBy: job.triggered_by,
    processed: job.stripe_subscriptions_processed,
    total: job.stripe_subscriptions_total,
    contributing: job.contributing_json || [],
    founding: job.founding_json || [],
    summary: job.summary_json || {
      contributing_count: job.missing_contributing_count,
      founding_count: job.missing_founding_count,
      total_count: (job.missing_contributing_count || 0) + (job.missing_founding_count || 0),
    },
    error: job.error_message,
    elapsedMs: job.elapsed_ms,
    completedAt: job.completed_at,
    expiresAt: job.expires_at,
  };
}

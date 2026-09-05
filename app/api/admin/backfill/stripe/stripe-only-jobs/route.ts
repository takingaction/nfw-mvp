import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if there's already a pending/processing job
    const { data: existingJob } = await supabaseAdmin
      .from("stripe_only_jobs")
      .select("id, status, created_at")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        message: "A job is already running. Check status endpoint."
      });
    }

    // Create new job
    const { data: job, error } = await supabaseAdmin
      .from("stripe_only_jobs")
      .insert({ status: "pending" })
      .select("id")
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: "pending",
      message: "Job created. Processing will happen on next cron run."
    });

  } catch (error: any) {
    console.error("[trigger-stripe-only] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      // Get specific job
      const { data: job } = await supabaseAdmin
        .from("stripe_only_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        error: job.error,
        charges: job.charges_json,
        total: job.total,
        completedAt: job.completed_at,
      });
    }

    // Get latest job
    const { data: latestJob } = await supabaseAdmin
      .from("stripe_only_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latestJob) {
      return NextResponse.json({ status: "no_jobs", message: "No jobs found" });
    }

    const isExpired = latestJob.expires_at && new Date(latestJob.expires_at) < new Date();

    return NextResponse.json({
      jobId: latestJob.id,
      status: latestJob.status,
      error: latestJob.error,
      charges: latestJob.charges_json,
      total: latestJob.total,
      completedAt: latestJob.completed_at,
      isExpired,
    });

  } catch (error: any) {
    console.error("[stripe-only-status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

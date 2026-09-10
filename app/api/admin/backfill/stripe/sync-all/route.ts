import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Admin auth check - cookie-based
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for existing pending/processing job
    const { data: existingJob } = await supabaseAdmin
      .from("sync_all_jobs")
      .select("id, status, created_at")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (existingJob) {
      console.log(`[sync-all] Existing job ${existingJob.id} already ${existingJob.status}, returning that`);
      return NextResponse.json({
        jobId: existingJob.id,
        message: `Job already ${existingJob.status}`
      });
    }

    // Count how many records need processing
    const { count: matchedCount } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("*", { count: "exact", head: true })
      .eq("status", "matched")
      .not("stripe_customer_id", "is", null);

    const { count: notFoundCount } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("*", { count: "exact", head: true })
      .eq("status", "not_found")
      .is("stripe_customer_id", null)
      .not("profile_id", "is", null);

    const totalRecords = (matchedCount || 0) + (notFoundCount || 0);

    // Create new job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("sync_all_jobs")
      .insert({
        status: "pending",
        total_records: totalRecords,
        processed_records: 0,
        synced_count: 0,
        failed_count: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("[sync-all] Error creating job:", jobError);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    console.log(`[sync-all] Created job ${job.id} with ${totalRecords} total records to process`);
    return NextResponse.json({
      jobId: job.id,
      message: "Job queued",
      totalRecords
    });

  } catch (error: any) {
    console.error("[sync-all] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to queue job" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const { data: job, error } = await supabaseAdmin
      .from("sync_all_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error: any) {
    console.error("[sync-all] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get job status" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

// POST: Create a payment_verify job
export async function POST(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if there's already a pending/processing job
    const { data: existingJob } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("id, status")
      .eq("job_type", "payment_verify")
      .in("status", ["pending", "processing"])
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({ 
        error: "A payment verification job is already running",
        jobId: existingJob.id,
        status: existingJob.status
      }, { status: 400 });
    }

    // Create a new payment_verify job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("reconciliation_jobs")
      .insert({ 
        job_type: "payment_verify",
        status: "pending",
        progress: "Queued for verification"
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    return NextResponse.json({ jobId: job.id });

  } catch (error: any) {
    console.error("[verify-payments] Error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// GET: Get cached verification data or poll job status
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If jobId provided, return job status
    if (jobId) {
      const { data: job } = await supabaseAdmin
        .from("reconciliation_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error,
        completedAt: job.completed_at,
      });
    }

    // No jobId - return cached verification data
    const { data: cachedJob } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("*")
      .eq("job_type", "payment_verify")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!cachedJob) {
      return NextResponse.json({ 
        verified: null,
        problematic_payments: [],
        lastVerifiedAt: null,
        cached: false
      });
    }

    const hasValidCache = !cachedJob.expires_at || new Date(cachedJob.expires_at) > new Date();

    if (!hasValidCache) {
      return NextResponse.json({
        verified: null,
        problematic_payments: [],
        lastVerifiedAt: cachedJob.completed_at,
        cached: false,
        expired: true
      });
    }

    return NextResponse.json({
      verified: cachedJob.verified_payments_json || { valid: 0, refunded: 0, failed: 0, not_found: 0 },
      problematic_payments: cachedJob.problematic_payments_json || [],
      lastVerifiedAt: cachedJob.completed_at,
      cached: true
    });

  } catch (error: any) {
    console.error("[verify-payments] Error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// DELETE: Clear verification cache
export async function DELETE(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all completed payment_verify jobs
    const { error: deleteError } = await supabaseAdmin
      .from("reconciliation_jobs")
      .delete()
      .eq("job_type", "payment_verify")
      .eq("status", "completed");

    if (deleteError) {
      console.error("[verify-payments] Delete error:", deleteError);
      return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Verification cache cleared" });

  } catch (error: any) {
    console.error("[verify-payments] Error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
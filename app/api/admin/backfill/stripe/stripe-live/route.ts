import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

// POST: Create a stripe_live job
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
      .eq("job_type", "stripe_live")
      .in("status", ["pending", "processing"])
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({ 
        error: "A stripe live job is already running",
        jobId: existingJob.id,
        status: existingJob.status
      }, { status: 400 });
    }

    // Create a new stripe_live job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("reconciliation_jobs")
      .insert({ 
        job_type: "stripe_live",
        status: "pending",
        progress: "Queued for processing"
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    return NextResponse.json({ jobId: job.id });

  } catch (error: any) {
    console.error("[stripe-live] Error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// GET: Get cached stripe live data or poll job status
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

      // If completed, include the stripe_live data
      if (job.status === "completed" && job.stripe_live_json) {
        return NextResponse.json({
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          stripeLive: job.stripe_live_json,
          completedAt: job.completed_at,
        });
      }

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error,
        completedAt: job.completed_at,
      });
    }

    // No jobId - return cached stripe live data
    const { data: cachedJob } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("*")
      .eq("job_type", "stripe_live")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (!cachedJob) {
      return NextResponse.json({ 
        stripeLive: null,
        lastFetchedAt: null,
        cached: false
      });
    }

    const hasValidCache = !cachedJob.expires_at || new Date(cachedJob.expires_at) > new Date();

    if (!hasValidCache) {
      return NextResponse.json({
        stripeLive: null,
        lastFetchedAt: cachedJob.completed_at,
        cached: false,
        expired: true
      });
    }

    return NextResponse.json({
      stripeLive: cachedJob.stripe_live_json || null,
      lastFetchedAt: cachedJob.completed_at,
      cached: true
    });

  } catch (error: any) {
    console.error("[stripe-live] Error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

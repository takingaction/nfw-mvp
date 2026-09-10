import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    // Check for existing cached result
    const { data: existingJob } = await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (existingJob && existingJob.duplicates_json) {
      return NextResponse.json({
        duplicates: existingJob.duplicates_json,
        duplicateCount: existingJob.duplicate_emails_count || 0,
        totalSubscriptions: existingJob.total_subscriptions || 0,
        cached: true,
        completedAt: existingJob.completed_at,
      });
    }

    return NextResponse.json({
      duplicates: [],
      duplicateCount: 0,
      totalSubscriptions: 0,
      cached: false,
    });

  } catch (error: any) {
    console.error("[duplicates] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get duplicates" },
      { status: 500 }
    );
  }
}

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

    // Check for existing pending/processing job
    const { data: existingJob } = await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .select("id, status")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        message: "Job already in progress",
      });
    }

    // Create new job
    const { data: newJob, error } = await supabaseAdmin
      .from("stripe_duplicates_jobs")
      .insert({ status: "pending" })
      .select("id")
      .single();

    if (error || !newJob) {
      console.error("[duplicates] Failed to create job:", error);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      );
    }

    console.log(`[duplicates] Created job ${newJob.id}`);

    return NextResponse.json({
      jobId: newJob.id,
      status: "pending",
      message: "Job created, processing in background",
    });

  } catch (error: any) {
    console.error("[duplicates] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger duplicates job" },
      { status: 500 }
    );
  }
}

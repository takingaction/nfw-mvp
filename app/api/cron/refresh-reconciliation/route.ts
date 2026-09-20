import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { refreshStripeLiveCache } from "@/lib/stripe-reconciliation";

/**
 * Cron: refresh the Stripe Live reconciliation cache every 10 minutes.
 *
 * Does exactly what the aubergine "Refresh" button on /admin/backfill/stripe does
 * (GET /api/admin/backfill/stripe/reconcile?fresh=true), minus the response
 * assembly — it only needs to update the stripe_live cache row.
 *
 * Skips if an admin-queued stripe_live background job is currently
 * pending/processing so the two don't race on the same cache row.
 *
 * Schedule: vercel.json → "*\/10 * * * *"
 */

export const dynamic = "force-dynamic";
// ~2,700 active subs = 28 Stripe pages ≈ 40s as of 2026-09-19. Leave headroom for growth.
export const maxDuration = 120;

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  try {
    // Guard: don't stomp on an in-flight admin-queued job
    const { data: inFlight } = await supabaseAdmin
      .from("reconciliation_jobs")
      .select("id, status")
      .eq("job_type", "stripe_live")
      .in("status", ["pending", "processing"])
      .limit(1)
      .maybeSingle();

    if (inFlight) {
      console.log(
        `[refresh-reconciliation] Skipping - stripe_live job ${inFlight.id} is ${inFlight.status}`,
      );
      return NextResponse.json({
        skipped: true,
        reason: "stripe_live job in progress",
        jobId: inFlight.id,
        status: inFlight.status,
      });
    }

    const data = await refreshStripeLiveCache();
    const elapsedMs = Date.now() - start;

    console.log(
      `[refresh-reconciliation] Refreshed in ${elapsedMs}ms: contributing=${data.contributing.count} founding=${data.founding.count} total=$${data.total.total}`,
    );

    return NextResponse.json({
      success: true,
      contributing: data.contributing,
      founding: data.founding,
      total: data.total,
      fetchedAt: data.fetchedAt,
      elapsedMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[refresh-reconciliation] Error:", message);
    return NextResponse.json(
      { error: message, elapsedMs: Date.now() - start },
      { status: 500 },
    );
  }
}

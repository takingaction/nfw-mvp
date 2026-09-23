import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyClientError } from "@/lib/slack-notifications";

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface OrphanGrant {
  grant_id: string;
  user_id: string;
  cycle_id: string;
  cycle_name: string;
  submitted_at: string;
  hours_since_submit: number;
}

/**
 * GET /api/cron/cleanup-orphaned-grants
 *
 * Daily report-only scan. Identifies grant rows with zero attached
 * documents where the cycle requires documents AND the grant is older
 * than 24 hours (so in-flight upload-first submissions aren't flagged).
 *
 * Detection query is a single LEFT JOIN ... WHERE d.id IS NULL, which
 * uses the existing indexes on grants.cycle_id, grants.submitted_at,
 * and grant_documents.grant_id. Should scan in milliseconds.
 *
 * The cron does NOT delete anything. It writes one row per run to
 * cleanup_orphan_grants_log and emits a Slack alert with the list.
 * Admins decide what to do via the reviewer panel or directly in
 * Supabase.
 *
 * Scheduled by vercel.json at 04:00 UTC daily.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Detection query (read-only, no mutations). The function is defined in
  // migration 179 with SECURITY DEFINER + explicit search_path so it works
  // correctly with the service-role client. It returns at most 50 rows.
  const { data: orphans, error } = await supabaseAdmin.rpc(
    "find_orphan_grant_candidates",
  );

  if (error) {
    console.error(
      "[cleanup-orphaned-grants] RPC find_orphan_grant_candidates failed:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to query orphan grants", details: error.message },
      { status: 500 },
    );
  }

  const orphanGrants: OrphanGrant[] = (orphans || []) as OrphanGrant[];

  // Always log the run, even when the candidate list is empty. This
  // makes it possible to verify the cron is firing on the daily Slack
  // digest schedule.
  const { error: logErr } = await supabaseAdmin
    .from("cleanup_orphan_grants_log")
    .insert({
      detected_count: orphanGrants.length,
      orphan_grants: orphanGrants,
    });

  if (logErr) {
    console.error(
      "[cleanup-orphaned-grants] failed to write log row:",
      logErr,
    );
  }

  // Slack alert only when there are actual candidates. An empty daily
  // run is silent (the log row still records the run).
  if (orphanGrants.length > 0) {
    const dateStr = new Date().toISOString().split("T")[0];

    // Group by cycle for readability.
    const byCycle = new Map<string, OrphanGrant[]>();
    for (const o of orphanGrants) {
      const list = byCycle.get(o.cycle_name) || [];
      list.push(o);
      byCycle.set(o.cycle_name, list);
    }
    const cycleBreakdown = Array.from(byCycle.entries())
      .map(([name, list]) => `  • ${name}: ${list.length}`)
      .join("\n");

    const summary = orphanGrants
      .slice(0, 10)
      .map(
        (o) =>
          `  • Grant ${o.grant_id.slice(0, 8)}… • User ${o.user_id.slice(0, 8)}… • ${o.hours_since_submit}h ago`,
      )
      .join("\n");
    const truncation = orphanGrants.length > 10
      ? `\n  …and ${orphanGrants.length - 10} more`
      : "";

    const message =
      `🟡 Orphan Grant Candidates — ${dateStr} (${orphanGrants.length} grants)\n\n` +
      `These grants have requires_documents=true and zero attached files, indicating a failed upload.\n\n` +
      `By cycle:\n${cycleBreakdown}\n\n` +
      `First 10:\n${summary}${truncation}\n\n` +
      `Review and attach docs via the reviewer panel, or delete the rows in Supabase.`;

    // notifyClientError reuses the same webhook as the client-error route
    // and the grant-error route. Its "context" field appears as the Slack
    // message preview; the body shows in the full block.
    await notifyClientError({
      userId: "cron",
      userEmail: "cleanup-orphaned-grants",
      context: "Orphan Grant Cleanup",
      errorMessage: message,
      extra: {
        runAt: new Date().toISOString(),
        detectedCount: orphanGrants.length,
        byCycle: Object.fromEntries(byCycle),
      },
    }).catch((slackErr) => {
      console.error("[cleanup-orphaned-grants] Slack notification failed:", slackErr);
    });
  }

  return NextResponse.json({
    success: true,
    detected_count: orphanGrants.length,
    candidates: orphanGrants,
  });
}

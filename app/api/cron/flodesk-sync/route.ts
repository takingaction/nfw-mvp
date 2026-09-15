import { NextResponse } from "next/server";
import { isFlodeskConfigured } from "@/lib/flodesk";
import { runFlodeskSync } from "@/lib/flodesk-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/flodesk-sync
 *
 * Hourly (vercel.json). For every enabled rule in flodesk_sync_rules:
 *   1. remove members who left the rule's category from its Flodesk segment
 *   2. add members who have been in the category for delay_days
 * Idempotent; safe to re-run. Stops early on time budget / 429 and continues next hour.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.log("[flodesk-sync] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFlodeskConfigured()) {
    console.log("[flodesk-sync] FLODESK_API_KEY not configured, skipping");
    return NextResponse.json({ message: "Flodesk not configured, skipping" });
  }

  const summary = await runFlodeskSync();

  const totals = summary.rules.reduce(
    (acc, r) => ({
      added: acc.added + r.added,
      removed: acc.removed + r.removed,
      failed: acc.failed + r.failed,
      remaining: acc.remaining + r.remaining,
    }),
    { added: 0, removed: 0, failed: 0, remaining: 0 },
  );

  console.log(
    `[flodesk-sync] added=${totals.added} removed=${totals.removed} failed=${totals.failed} remaining=${totals.remaining} ` +
      `budgetExhausted=${summary.budgetExhausted} rateLimited=${summary.rateLimited} ${summary.durationMs}ms`,
  );

  return NextResponse.json({ ...summary, totals }, { status: summary.ok ? 200 : 500 });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import { runFlodeskSync } from "@/lib/flodesk-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/flodesk/rules/[id]/preview
 * Dry run for one rule: how many members would be added / removed right now,
 * plus a sample of emails. No Flodesk calls, no DB writes.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const summary = await runFlodeskSync({ ruleId: id, dryRun: true });

  if (!summary.ok) {
    return NextResponse.json({ error: summary.error || "Preview failed" }, { status: 500 });
  }
  if (summary.skipped === "no_rules") {
    return NextResponse.json(
      { error: "Rule not found, or it has no Flodesk segment assigned yet" },
      { status: 400 },
    );
  }

  const result = summary.rules[0];
  return NextResponse.json({
    ruleId: id,
    wouldAdd: result?.added ?? 0,
    wouldRemove: result?.removed ?? 0,
    sampleAdd: result?.sampleAdd ?? [],
    sampleRemove: result?.sampleRemove ?? [],
    durationMs: summary.durationMs,
  });
}

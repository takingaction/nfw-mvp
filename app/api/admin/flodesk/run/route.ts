import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import { isFlodeskConfigured } from "@/lib/flodesk";
import { clearRule, runFlodeskSync } from "@/lib/flodesk-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/flodesk/run
 * Body: { ruleId?: string; action?: "sync" | "clear" }
 *
 *  - sync  (default): same as the hourly cron. With ruleId, runs that rule even if disabled.
 *  - clear: remove every member currently in the rule's segment (requires ruleId).
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isFlodeskConfigured()) {
    return NextResponse.json({ error: "FLODESK_API_KEY is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { ruleId?: string; action?: string };
  const action = body.action === "clear" ? "clear" : "sync";

  if (action === "clear") {
    if (!body.ruleId) {
      return NextResponse.json({ error: "ruleId is required for clear" }, { status: 400 });
    }
    const result = await clearRule(body.ruleId);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }

  const summary = await runFlodeskSync({ ruleId: body.ruleId });
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

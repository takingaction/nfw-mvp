import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { RULE_CATEGORIES } from "@/lib/flodesk-rules";
import { validateRuleInput } from "@/lib/flodesk-rule-input";

export const dynamic = "force-dynamic";

interface RuleCounts {
  added: number;
  removed: number;
  failed: number;
}

/** GET /api/admin/flodesk/rules — all rules with sync counts */
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data: rules, error } = await admin
    .from("flodesk_sync_rules")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/flodesk/rules] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Per-rule status counts (three head-count queries per rule; rule count is tiny)
  const counts: Record<string, RuleCounts> = {};
  for (const rule of rules || []) {
    const [added, removed, failed] = await Promise.all(
      (["added", "removed", "failed"] as const).map((status) =>
        admin
          .from("flodesk_sync_members")
          .select("*", { count: "exact", head: true })
          .eq("rule_id", rule.id)
          .eq("status", status),
      ),
    );
    counts[rule.id] = {
      added: added.count ?? 0,
      removed: removed.count ?? 0,
      failed: failed.count ?? 0,
    };
  }

  return NextResponse.json({
    rules: (rules || []).map((r) => ({ ...r, counts: counts[r.id] })),
    categories: RULE_CATEGORIES,
  });
}

/** POST /api/admin/flodesk/rules — create a rule */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateRuleInput(body, { requireAll: true });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("flodesk_sync_rules")
    .insert(validation.values)
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ rule: data }, { status: 201 });
}

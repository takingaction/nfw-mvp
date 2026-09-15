import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { validateRuleInput } from "@/lib/flodesk-rule-input";

export const dynamic = "force-dynamic";

/** PUT /api/admin/flodesk/rules/[id] — partial update */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const validation = validateRuleInput(body, { requireAll: false });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const admin = getAdminClient();

  // Enabling requires a segment — check against the merged state, not just the patch
  if (validation.values.is_enabled === true && validation.values.flodesk_segment_id === undefined) {
    const { data: existing } = await admin
      .from("flodesk_sync_rules")
      .select("flodesk_segment_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing?.flodesk_segment_id) {
      return NextResponse.json({ error: "Assign a Flodesk segment before enabling this rule" }, { status: 400 });
    }
  }

  const { data, error } = await admin
    .from("flodesk_sync_rules")
    .update(validation.values)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : error.code === "23514" ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (!data) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  return NextResponse.json({ rule: data });
}

/**
 * DELETE /api/admin/flodesk/rules/[id]
 * Deletes the rule and its sync state (cascade). Does NOT touch Flodesk —
 * members stay in the segment. Use "Clear segment" (POST /run { action: "clear" })
 * first if you want them removed.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const admin = getAdminClient();
  const { error } = await admin.from("flodesk_sync_rules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

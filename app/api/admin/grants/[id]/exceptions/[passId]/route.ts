import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import {
  CYCLE_LOCK_COLUMNS,
  isFirstReviewLocked,
  LATE_PASS_DURATION_HOURS,
} from "@/lib/grant-eligibility";

/**
 * PATCH /api/admin/grants/[id]/exceptions/[passId]
 * Extends a Late Submission Pass to NOW + 12h. Works on active, expired
 * and revoked passes (clears revoked_at — acts as an undo). Used passes
 * can't be extended (the application already exists).
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; passId: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: cycleId, passId } = await params;
  const admin = getAdminClient();

  const { data: pass } = await admin
    .from("grant_cycle_exceptions")
    .select("id, user_id, used_at")
    .eq("id", passId)
    .eq("cycle_id", cycleId)
    .maybeSingle();
  if (!pass) {
    return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  }
  if (pass.used_at) {
    return NextResponse.json(
      { error: "This pass was already used — the member has submitted their application." },
      { status: 409 },
    );
  }

  const { data: cycle } = await admin
    .from("grant_cycles")
    .select(`id, ${CYCLE_LOCK_COLUMNS}`)
    .eq("id", cycleId)
    .maybeSingle();
  if (!cycle) {
    return NextResponse.json({ error: "Grant cycle not found" }, { status: 404 });
  }
  if (isFirstReviewLocked(cycle)) {
    return NextResponse.json(
      { error: "First review is complete for this cycle — passes can no longer be extended." },
      { status: 409 },
    );
  }

  const { data: existingGrant } = await admin
    .from("grants")
    .select("id")
    .eq("user_id", pass.user_id)
    .eq("cycle_id", cycleId)
    .maybeSingle();
  if (existingGrant) {
    return NextResponse.json(
      { error: "This member has already applied to this cycle." },
      { status: 409 },
    );
  }

  const expiresAt = new Date(Date.now() + LATE_PASS_DURATION_HOURS * 60 * 60 * 1000).toISOString();
  const { data: updated, error } = await admin
    .from("grant_cycle_exceptions")
    .update({ expires_at: expiresAt, revoked_at: null, revoked_by: null })
    .eq("id", passId)
    .eq("cycle_id", cycleId)
    .is("used_at", null)
    .select("id, expires_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This member already has another active pass for this cycle. Extend that one instead." },
        { status: 409 },
      );
    }
    console.error("[exceptions PATCH] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: "This pass was just used and can no longer be extended." },
      { status: 409 },
    );
  }
  return NextResponse.json({ pass: updated });
}

/**
 * DELETE /api/admin/grants/[id]/exceptions/[passId]
 * Revokes a Late Submission Pass (soft — sets revoked_at, keeps audit row).
 * Used passes can't be revoked (the application already exists).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; passId: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: cycleId, passId } = await params;
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("grant_cycle_exceptions")
    .update({ revoked_at: new Date().toISOString(), revoked_by: adminCheck.user.id })
    .eq("id", passId)
    .eq("cycle_id", cycleId)
    .is("used_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[exceptions DELETE] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Pass not found, already used, or already revoked." },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}

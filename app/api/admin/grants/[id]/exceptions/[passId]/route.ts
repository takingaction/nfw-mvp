import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

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

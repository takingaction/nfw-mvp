import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { requireGrantsAccess } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

/**
 * Bulk "Mark all irrelevant as Not Approved" for Review 1.
 *
 * Applies the same reviewer skip as "Skip & Mark Invalid" (ai_invalidated_at)
 * to every application in the cycle that the AI marked irrelevant — i.e. it
 * failed at least one criterion — and that no reviewer has already marked
 * valid or skipped. "Uncertain" applications are left for a person to decide.
 *
 * Like the single skip, this does NOT change grants.status: members keep
 * seeing "Submitted" until Finalize Approvals sends the rejection email.
 * Each skip can still be undone individually with Restore.
 *
 * GET  → { count } of applications that would be affected (for the modal)
 * POST → { updated }
 */

async function guard(cycleId: string) {
  const auth = await requireGrantsAccess();
  if (!auth.authorized || !auth.user) {
    return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }), userId: null };
  }
  const admin = getAdminClient();
  const { data: cycle } = await admin
    .from("grant_cycles")
    .select("id, final_approved_at")
    .eq("id", cycleId)
    .maybeSingle();
  if (!cycle) return { res: NextResponse.json({ error: "Cycle not found" }, { status: 404 }), userId: null };
  if (cycle.final_approved_at) {
    return {
      res: NextResponse.json({ error: "This cycle has already been finalized." }, { status: 400 }),
      userId: null,
    };
  }
  return { res: null, userId: auth.user.id };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cycleId } = await params;
    const g = await guard(cycleId);
    if (g.res) return g.res;
    const { count, error } = await getAdminClient()
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .eq("status", "submitted")
      .eq("ai_relevance", "irrelevant")
      .is("ai_invalidated_at", null)
      .is("ai_validated_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cycleId } = await params;
    const g = await guard(cycleId);
    if (g.res) return g.res;
    // Same filter as GET — keep them in sync.
    const { count, error } = await getAdminClient()
      .from("grants")
      .update(
        { ai_invalidated_at: new Date().toISOString(), ai_invalidated_by: g.userId },
        { count: "exact" },
      )
      .eq("cycle_id", cycleId)
      .eq("status", "submitted")
      .eq("ai_relevance", "irrelevant")
      .is("ai_invalidated_at", null)
      .is("ai_validated_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, updated: count ?? 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

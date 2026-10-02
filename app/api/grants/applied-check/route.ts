import { blockIfViewingAs } from "@/lib/view-as";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/grants/applied-check?cycleId=X
 *
 * Reports whether the authenticated member already has an application
 * in the given grant cycle. Used by the apply form's pre-submit
 * duplicate check (2026-10-01) so members with an existing application
 * are redirected to it BEFORE any document upload is attempted —
 * previously this surfaced as a confusing 409 from /api/grants/create
 * only after the uploads had already been re-transferred.
 *
 * Own-row read under RLS (same session client as /api/grants/cycles/open).
 * The form fails open if this endpoint errors — /api/grants/create's
 * duplicate guard remains the correctness layer.
 */
export const maxDuration = 10;

export async function GET(request: Request) {
  const viewAsBlocked = blockIfViewingAs(request);
  if (viewAsBlocked) return viewAsBlocked;

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) {
    return NextResponse.json(
      { error: "Missing cycleId parameter" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("grants")
    .select("id")
    .eq("user_id", user.id)
    .eq("cycle_id", cycleId)
    .limit(1);

  if (error) {
    console.error("[grants/applied-check] query error:", error);
    // Fail open: report not-applied so the form proceeds. The create
    // route's duplicate guard still blocks a real duplicate.
    return NextResponse.json({ applied: false, grantId: null });
  }

  return NextResponse.json({
    applied: (data?.length ?? 0) > 0,
    grantId: data?.[0]?.id ?? null,
  });
}

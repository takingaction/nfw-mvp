import { blockIfViewingAs } from "@/lib/view-as";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { listPassCyclesForUser } from "@/lib/grant-eligibility";

/**
 * GET /api/grants/cycles/open
 *
 * Returns the list of grant cycles that are currently accepting
 * applications, for the authenticated member. Mirrors the SSR-time
 * filter in app/grants/apply/page.tsx so the form's pre-submit cycle
 * check (Part C of the cycle-closed UX fix, 2026-09-23) sees the
 * same cycle list the apply page initially rendered.
 *
 * Cycle inclusion rules:
 *   - status = 'open'
 *   - end_date >= today (UTC date string compare)
 *   - is_testing_only only included for admins
 *   - PLUS closed cycles the member holds a live Late Submission Pass for
 *     (migration 196), tagged { viaPass: true, passExpiresAt }
 *
 * Used by components/GrantApplicationForm handleConfirmSubmit to
 * detect a cycle that closed between when the apply page rendered
 * and when the member clicked Confirm. The form shows the same
 * "Back to all cycles" CTA it would show on a real cycle-closed 400.
 *
 * The check fails open: if this endpoint returns non-OK, the form
 * proceeds with the upload. The worst case is the existing UX (member
 * sees a cycle-closed 400 mid-flow with the new friendly message
 * from Part B). Part C is a UX optimization, not a correctness
 * guarantee.
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

  // Admin detection mirrors the SSR logic in app/grants/apply/page.tsx
  // and the prepare route: testing-only cycles are admin-only.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.is_admin === true;

  let query = supabase
    .from("grant_cycles")
    .select("id, cycle_name, description, start_date, end_date, amount_per_grant, grants_available, requires_documents, display_order, status, is_testing_only, featured_image")
    .eq("status", "open")
    .order("display_order", { ascending: true })
    .order("end_date", { ascending: true });

  if (!isAdmin) {
    query = query.eq("is_testing_only", false);
  }

  const { data: cycles, error } = await query;

  if (error) {
    console.error("[grants/cycles/open] query error:", error);
    // Fail open: return empty list so the form doesn't block. Member
    // will see a real cycle-closed 400 mid-flow if applicable.
    return NextResponse.json({ cycles: [] }, { status: 200 });
  }

  // Filter out past-dated cycles in JS (the apply page does this too
  // because Supabase date filters can be unreliable on ISO strings).
  const todayStr = new Date().toISOString().split("T")[0];
  const openCycles = (cycles ?? []).filter(
    (c: { end_date: string }) => c.end_date >= todayStr,
  );

  // Late Submission Passes: add closed cycles this member may still apply to.
  const passCycles = await listPassCyclesForUser(user.id);
  const openIds = new Set(openCycles.map((c: { id: string }) => c.id));
  const extra = passCycles
    .filter((c) => !openIds.has(c.id))
    .map((c) => ({
      id: c.id,
      cycle_name: c.cycle_name,
      description: c.description,
      start_date: c.start_date,
      end_date: c.end_date,
      amount_per_grant: c.amount_per_grant,
      grants_available: c.grants_available,
      requires_documents: c.requires_documents,
      display_order: c.display_order,
      status: c.status,
      is_testing_only: c.is_testing_only,
      featured_image: c.featured_image,
      viaPass: true,
      passExpiresAt: c.passExpiresAt,
    }));

  return NextResponse.json({ cycles: [...openCycles, ...extra] });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/middleware/adminCheck";
import { clearImpersonationCookieHeader } from "@/lib/impersonation";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/view-as/stop
 *
 * Clears the view_as cookie. The audit log row remains open in the DB; we
 * don't currently mark ended_at on stop (v1 simplification). Cookie clear is
 * sufficient to end the active session for the admin's browser.
 */
export async function POST() {
  const result = await requireAdmin({ redirectOnFailure: true });
  if (!result.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const c = clearImpersonationCookieHeader();
  const res = NextResponse.json({ success: true });
  res.cookies.set(c.name, c.value, c.options);
  return res;
}

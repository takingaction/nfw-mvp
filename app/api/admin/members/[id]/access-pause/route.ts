import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import { rateLimit } from "@/lib/rate-limit";
import {
  notifyAccessPauseChange,
  pauseMemberAccess,
  unpauseMemberAccess,
} from "@/lib/access-pause";

/**
 * POST /api/admin/members/[id]/access-pause   (admins only)
 *   { action: "pause", reason: string, disputeId?: "dp_..." }
 *   { action: "unpause" }
 *
 * See lib/access-pause.ts and migration 205.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`admin-access-pause:${ip}`, 20, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { authorized, user } = await requireAdmin();
  if (!authorized || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: memberId } = await params;
  if (!UUID_RE.test(memberId)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  let body: { action?: unknown; reason?: unknown; disputeId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.action === "pause") {
    if (memberId === user.id) {
      return NextResponse.json({ error: "You can't pause your own account" }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason : "";
    const disputeId = typeof body.disputeId === "string" ? body.disputeId : null;
    const res = await pauseMemberAccess({ memberId, adminId: user.id, reason, disputeId });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    await notifyAccessPauseChange({
      action: "paused",
      memberId,
      email: res.email,
      reason: reason.trim(),
      disputeId: disputeId?.trim() || null,
      adminEmail: user.email,
    });
    return NextResponse.json({ success: true, paused: true });
  }

  if (body.action === "unpause") {
    const res = await unpauseMemberAccess(memberId);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    await notifyAccessPauseChange({
      action: "unpaused",
      memberId,
      email: res.email,
      adminEmail: user.email,
    });
    return NextResponse.json({ success: true, paused: false });
  }

  return NextResponse.json({ error: 'action must be "pause" or "unpause"' }, { status: 400 });
}

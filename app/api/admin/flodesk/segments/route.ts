import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import { isFlodeskConfigured, listSegments } from "@/lib/flodesk";

export const dynamic = "force-dynamic";

/** GET /api/admin/flodesk/segments — proxy Flodesk's segment list for the rule editor dropdown */
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isFlodeskConfigured()) {
    return NextResponse.json({ error: "FLODESK_API_KEY is not configured", segments: [] }, { status: 503 });
  }

  const res = await listSegments();
  if (!res.ok) {
    return NextResponse.json({ error: res.error, segments: [] }, { status: res.status === 401 ? 401 : 502 });
  }

  return NextResponse.json({
    segments: res.data
      .map((s) => ({ id: s.id, name: s.name, total_active_subscribers: s.total_active_subscribers ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
}

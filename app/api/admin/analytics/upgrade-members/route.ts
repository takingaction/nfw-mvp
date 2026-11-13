import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

/**
 * Names and emails for the members behind an upgrade card on
 * /admin/analytics. The page itself no longer sends member names or emails
 * to the browser; it asks for them here when a card is opened.
 *
 * POST { ids: string[] } → { members: { [id]: { full_name, email } } }
 */
const MAX_IDS = 20000;
const CHUNK = 200; // keeps each PostgREST `in` filter well under URL limits

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids)
    ? Array.from(new Set((body.ids as unknown[]).filter((x): x is string => typeof x === "string" && UUID.test(x))))
    : [];
  if (ids.length === 0) return NextResponse.json({ members: {} });
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: "Too many ids" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  const results = await Promise.all(
    chunks.map((chunk) => supabase.from("profiles").select("id, full_name, email").in("id", chunk)),
  );

  const members: Record<string, { full_name: string | null; email: string | null }> = {};
  for (const { data, error } of results) {
    if (error) {
      console.error("[analytics/upgrade-members] lookup failed:", error);
      return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
    }
    for (const row of data ?? []) members[row.id] = { full_name: row.full_name, email: row.email };
  }
  return NextResponse.json({ members });
}

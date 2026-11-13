import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

/**
 * POST { profileId, comped: boolean, note?: string }
 *
 * Marks a paid member's membership as complimentary (or removes the mark).
 * Label only: it doesn't change their level or access. Comped members show as
 * expected on the Stripe Sync page instead of "Paid in DB, nothing in Stripe".
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const profileId = typeof body?.profileId === "string" ? body.profileId : null;
  const comped = body?.comped === true;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  if (!profileId || typeof body?.comped !== "boolean") {
    return NextResponse.json({ error: "profileId and comped are required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("id, membership_level")
    .eq("id", profileId)
    .maybeSingle();
  if (readError || !profile) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (comped && profile.membership_level !== "contributing" && profile.membership_level !== "founding") {
    return NextResponse.json({ error: "Only contributing or founding members can be marked comped" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      comped_at: comped ? new Date().toISOString() : null,
      comped_note: comped ? note : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (error) {
    console.error("[repair/comped] update failed:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }

  console.log(`[repair/comped] ${admin.user?.email ?? admin.user?.id} set comped=${comped} on ${profileId}`);
  return NextResponse.json({ ok: true, comped });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import {
  CYCLE_LOCK_COLUMNS,
  getPassStatus,
  isFirstReviewLocked,
  LATE_PASS_DURATION_HOURS,
} from "@/lib/grant-eligibility";

/**
 * Late Submission Passes (migration 196) — admin list + issue.
 *
 * GET  /api/admin/grants/[id]/exceptions  → { passes, locked }
 * POST /api/admin/grants/[id]/exceptions  { email, reason } → { pass }
 *
 * A pass lets one member apply to this (closed) cycle for 12 hours without
 * reopening it publicly. Blocked once first review is complete.
 */

interface PassRow {
  id: string;
  user_id: string;
  granted_by: string | null;
  revoked_by: string | null;
  reason: string;
  expires_at: string;
  used_at: string | null;
  used_grant_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: cycleId } = await params;
  const admin = getAdminClient();

  const { data: cycle } = await admin
    .from("grant_cycles")
    .select(`id, status, ${CYCLE_LOCK_COLUMNS}`)
    .eq("id", cycleId)
    .maybeSingle();
  if (!cycle) {
    return NextResponse.json({ error: "Grant cycle not found" }, { status: 404 });
  }

  const { data: passes, error } = await admin
    .from("grant_cycle_exceptions")
    .select("id, user_id, granted_by, revoked_by, reason, expires_at, used_at, used_grant_id, revoked_at, created_at")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[exceptions GET] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (passes ?? []) as PassRow[];
  const profileIds = [
    ...new Set(rows.flatMap((p) => [p.user_id, p.granted_by, p.revoked_by]).filter(Boolean) as string[]),
  ];
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds);
    for (const p of profiles ?? []) profileMap.set(p.id, { full_name: p.full_name, email: p.email });
  }

  return NextResponse.json({
    locked: isFirstReviewLocked(cycle),
    cycleStatus: cycle.status,
    passes: rows.map((p) => ({
      ...p,
      status: getPassStatus(p),
      member: profileMap.get(p.user_id) ?? null,
      grantedBy: p.granted_by ? profileMap.get(p.granted_by) ?? null : null,
      revokedBy: p.revoked_by ? profileMap.get(p.revoked_by) ?? null : null,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: cycleId } = await params;

  let body: { email?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter the member's email address" }, { status: 400 });
  }
  if (reason.length < 5) {
    return NextResponse.json({ error: "Reason must be at least 5 characters" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: cycle } = await admin
    .from("grant_cycles")
    .select(`id, status, is_testing_only, ${CYCLE_LOCK_COLUMNS}`)
    .eq("id", cycleId)
    .maybeSingle();
  if (!cycle) {
    return NextResponse.json({ error: "Grant cycle not found" }, { status: 404 });
  }
  if (isFirstReviewLocked(cycle)) {
    return NextResponse.json(
      { error: "First review is complete for this cycle — late submissions are no longer allowed." },
      { status: 409 },
    );
  }
  if (cycle.is_testing_only) {
    return NextResponse.json(
      { error: "Passes can't be issued for testing-only cycles." },
      { status: 400 },
    );
  }

  const { data: member } = await admin
    .from("profiles")
    .select("id, full_name, email, profile_completed, membership_level, is_approved_free_member")
    // Case-insensitive exact match; escape LIKE wildcards (e.g. "_" in emails).
    .ilike("email", email.replace(/[\\%_]/g, (ch) => `\\${ch}`))
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "No member found with that email" }, { status: 404 });
  }
  const tierOk =
    member.membership_level === "contributing" ||
    member.membership_level === "founding" ||
    (member.membership_level === "free" && member.is_approved_free_member === true);
  if (!member.profile_completed || !tierOk) {
    return NextResponse.json(
      {
        error:
          "This member isn't eligible to apply (incomplete profile, waitlist, or unapproved free membership).",
      },
      { status: 400 },
    );
  }

  const { data: existingGrant } = await admin
    .from("grants")
    .select("id")
    .eq("user_id", member.id)
    .eq("cycle_id", cycleId)
    .maybeSingle();
  if (existingGrant) {
    return NextResponse.json(
      { error: "This member has already applied to this cycle." },
      { status: 409 },
    );
  }

  // Revoke any expired-but-unused pass so the partial unique index
  // (one live pass per member per cycle) doesn't block re-issuing.
  const nowIso = new Date().toISOString();
  await admin
    .from("grant_cycle_exceptions")
    .update({ revoked_at: nowIso, revoked_by: adminCheck.user.id })
    .eq("cycle_id", cycleId)
    .eq("user_id", member.id)
    .is("used_at", null)
    .is("revoked_at", null)
    .lte("expires_at", nowIso);

  const expiresAt = new Date(Date.now() + LATE_PASS_DURATION_HOURS * 60 * 60 * 1000).toISOString();
  const { data: pass, error: insertError } = await admin
    .from("grant_cycle_exceptions")
    .insert({
      cycle_id: cycleId,
      user_id: member.id,
      granted_by: adminCheck.user.id,
      reason,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This member already has an active pass for this cycle." },
        { status: 409 },
      );
    }
    console.error("[exceptions POST] insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    pass: { ...pass, member: { full_name: member.full_name, email: member.email } },
  });
}

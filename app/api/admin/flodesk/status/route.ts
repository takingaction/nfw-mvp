import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { isFlodeskConfigured, testConnection } from "@/lib/flodesk";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/flodesk/status
 * Connection health + recent failures for the admin page header.
 */
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const configured = isFlodeskConfigured();
  let connection: { ok: boolean; segmentCount?: number; error?: string } = { ok: false, error: "not_configured" };
  if (configured) {
    const res = await testConnection();
    connection = res.ok ? { ok: true, segmentCount: res.data.segmentCount } : { ok: false, error: res.error };
  }

  const admin = getAdminClient();
  const { data: failures } = await admin
    .from("flodesk_sync_members")
    .select("rule_id, profile_id, status, attempt_count, last_error, updated_at, profiles(email, full_name), flodesk_sync_rules(name)")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(50);

  const recentFailures = (failures || []).map((f) => {
    const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
    const rule = Array.isArray(f.flodesk_sync_rules) ? f.flodesk_sync_rules[0] : f.flodesk_sync_rules;
    return {
      ruleId: f.rule_id,
      ruleName: (rule as { name?: string } | null)?.name ?? "",
      profileId: f.profile_id,
      email: (profile as { email?: string | null } | null)?.email ?? null,
      fullName: (profile as { full_name?: string | null } | null)?.full_name ?? null,
      attemptCount: f.attempt_count,
      lastError: f.last_error,
      updatedAt: f.updated_at,
    };
  });

  return NextResponse.json({ configured, connection, recentFailures });
}

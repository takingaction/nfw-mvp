import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

/**
 * Member Experience Baseline metrics (migration 217).
 *
 * GET  → metrics from public.get_experience_baseline() (reads the
 *        analytics.member_baseline materialized view, refreshed nightly).
 * POST → refresh the materialized view first, then return fresh metrics.
 *
 * Definitions: MEMBER_EXPERIENCE_ANALYTICS.md
 */

const COHORT_FROM = "2026-05-01"; // first month all three programs were live

async function loadBaseline() {
  const { data, error } = await getAdminClient().rpc("get_experience_baseline", {
    p_cohort_from: COHORT_FROM,
  });
  if (error) {
    console.error("[analytics/experience] get_experience_baseline failed:", error);
    return NextResponse.json({ error: "Failed to load member experience metrics" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return loadBaseline();
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await getAdminClient().rpc("refresh_member_baseline");
  if (error) {
    console.error("[analytics/experience] refresh_member_baseline failed:", error);
    return NextResponse.json({ error: "Failed to refresh member experience data" }, { status: 500 });
  }
  return loadBaseline();
}

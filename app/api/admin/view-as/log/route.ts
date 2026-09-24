import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/view-as/log
 * Paginated, filterable audit log of all "View as Member" sessions.
 * Admin-only. Same pattern as the deleted impersonation-log endpoint.
 */

const PAGE_SIZE = 50;
const VALID_STATUSES = new Set(["all", "active", "ended"]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (profile?.is_admin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const status = url.searchParams.get("status") || "all";
  const adminUserId = url.searchParams.get("adminUserId") || "";
  const targetUserId = url.searchParams.get("targetUserId") || "";
  const search = (url.searchParams.get("search") || "").trim();
  const fromDate = url.searchParams.get("fromDate") || "";
  const toDate = url.searchParams.get("toDate") || "";

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Use service-role to bypass RLS for the read. Admin already verified.
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  let query = supabaseAdmin
    .from("admin_view_logs")
    .select(
      "id, admin_user_id, target_user_id, started_at, ended_at, end_reason, reason, initial_page, ip_address, user_agent, admin:profiles!admin_view_logs_admin_user_id_fkey(email, full_name), target:profiles!admin_view_logs_target_user_id_fkey(email, full_name)",
      { count: "exact" },
    )
    .order("started_at", { ascending: false });

  if (status === "active") query = query.is("ended_at", null);
  if (status === "ended") query = query.not("ended_at", "is", null);
  if (adminUserId) query = query.eq("admin_user_id", adminUserId);
  if (targetUserId) query = query.eq("target_user_id", targetUserId);
  if (fromDate) query = query.gte("started_at", fromDate);
  if (toDate) query = query.lte("started_at", toDate);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) {
    console.error("[view-as/log] query error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }

  // Client-side search on reason and emails. PostgREST has no OR-with-joins.
  const filtered = (data || []).filter((row) => {
    if (!search) return true;
    const hay = [
      row.reason,
      (row.admin as { email?: string } | null)?.email,
      (row.admin as { full_name?: string } | null)?.full_name,
      (row.target as { email?: string } | null)?.email,
      (row.target as { full_name?: string } | null)?.full_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return NextResponse.json({
    rows: filtered,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

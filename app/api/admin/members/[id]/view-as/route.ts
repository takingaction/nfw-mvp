import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminCheck";
import { setImpersonationCookieHeader } from "@/lib/impersonation";

/**
 * POST /api/admin/members/[id]/view-as
 *
 * Start a "View as Member" session. Returns the target info so the admin
 * client can navigate to the chosen initial page with `?view_as=<uuid>`.
 *
 * The URL is the state. No cookie, no token. The admin's auth cookie remains
 * untouched. Pages detect `?view_as=` and filter queries to the target.
 * Member-facing write API routes refuse writes when `?view_as=` is present.
 *
 * Audit row is written in `admin_view_logs`. 7-year retention via
 * `retention_expires_at` generated column.
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_IMPERSONATABLE_ADMINS = [
  "kelsey@nationalfundforwomen.org",
  "ron@myherodesign.com",
];

// Simple in-memory rate limiter. 30 sessions per hour per admin. Sufficient
// for the support-debug use case; if needed later this can move to a
// persistent table.
const RECENT_SESSIONS: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function isRateLimited(adminUserId: string): boolean {
  const now = Date.now();
  const timestamps = (RECENT_SESSIONS.get(adminUserId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  RECENT_SESSIONS.set(adminUserId, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function isAdminImpersonatable(isAdmin: boolean, email: string | null | undefined): boolean {
  if (!isAdmin) return true; // non-admins are always allowed
  return !!email && ALLOWED_IMPERSONATABLE_ADMINS.includes(email.toLowerCase());
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await requireAdmin({ redirectOnFailure: true });
  if (!result.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminUser = result.user;

  if (isRateLimited(adminUser.id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a few minutes." },
      { status: 429 }
    );
  }

  let body: { reason?: string; initial_page?: string };
  try {
    body = (await request.json()) as { reason?: string; initial_page?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (reason.length < 5 || reason.length > 500) {
    return NextResponse.json(
      { error: "Reason must be between 5 and 500 characters" },
      { status: 400 }
    );
  }

  const initialPage = (body.initial_page ?? "").trim() || "/dashboard";
  if (initialPage.length > 500 || !initialPage.startsWith("/")) {
    return NextResponse.json(
      { error: "initial_page must be a relative path starting with /" },
      { status: 400 }
    );
  }

  const { id: targetUserId } = await params;
  if (targetUserId === adminUser.id) {
    return NextResponse.json(
      { error: "You cannot view as yourself" },
      { status: 403 }
    );
  }

  const supabase = await createServerClient();
  const { data: targetProfile, error: targetErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin")
    .eq("id", targetUserId)
    .single();
  if (targetErr || !targetProfile) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (
    !isAdminImpersonatable(targetProfile.is_admin === true, targetProfile.email)
  ) {
    return NextResponse.json(
      { error: "Target is an admin not on the impersonation allowlist" },
      { status: 403 }
    );
  }

  // Request metadata
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent") || null;

  // Use the service-role key to bypass RLS for the insert. The row is
  // protected by RLS for reads, but admins writing audit rows is fine
  // here because we already verified is_admin above.
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: log, error: insertErr } = await supabaseAdmin
    .from("admin_view_logs")
    .insert({
      admin_user_id: adminUser.id,
      target_user_id: targetProfile.id,
      reason,
      initial_page: initialPage,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (insertErr || !log) {
    console.error("[view-as] Insert error:", insertErr);
    return NextResponse.json(
      { error: "Failed to start view session" },
      { status: 500 }
    );
  }

  const cookie = setImpersonationCookieHeader(log.id);
  const res = NextResponse.json({
    success: true,
    logId: log.id,
    targetUserId: targetProfile.id,
    targetEmail: targetProfile.email,
    targetFullName: targetProfile.full_name,
    initialPage,
  });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

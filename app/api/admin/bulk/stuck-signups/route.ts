import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrScope } from "@/lib/adminCheck";
import { sendIncompleteMemberEmail, fetchTemplateWithActiveCheck } from "@/lib/email";
import { getPreRenderedHtmlAdmin } from "@/lib/email-blocks/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Same template as the incomplete-members reminder ("You started signing up…"). */
const REMINDER_SLUG = "incomplete-member-reengagement";
/** Leave brand-new signups alone; they may still be mid-flow. */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
/** Per request, so one call stays well inside the function time limit. The UI loops. */
const BATCH_SIZE = 40;
const BATCH_DELAY_MS = 200;

export type StuckSignup = {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string;
  last_sign_in_at: string | null;
  providers: string[];
  last_reminder_at: string | null;
};

async function loadStuck(): Promise<{ rows: StuckSignup[]; error?: string }> {
  const { data, error } = await getAdminClient().rpc("admin_list_stuck_signups", { reminder_slug: REMINDER_SLUG });
  if (error) {
    console.error("[admin/bulk/stuck-signups] RPC failed:", error);
    const missing = error.code === "PGRST202" || /admin_list_stuck_signups/.test(error.message);
    return { rows: [], error: missing ? "Not set up yet: run migration 221." : "Failed to load stuck signups" };
  }
  return { rows: (data as StuckSignup[] | null) ?? [] };
}

function isEligible(row: StuckSignup, now: number) {
  return !row.last_reminder_at && now - new Date(row.created_at).getTime() >= MIN_AGE_MS;
}

/**
 * GET /api/admin/bulk/stuck-signups
 * Confirmed accounts with no profile (signup stalled before step 1).
 */
export async function GET() {
  const adminCheck = await requireAdminOrScope("members");
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows, error } = await loadStuck();
  if (error) return NextResponse.json({ error }, { status: 500 });

  const now = Date.now();
  return NextResponse.json({
    signups: rows,
    stats: {
      total: rows.length,
      reminded: rows.filter((r) => r.last_reminder_at).length,
      eligible: rows.filter((r) => isEligible(r, now)).length,
      tooRecent: rows.filter((r) => !r.last_reminder_at && !isEligible(r, now)).length,
    },
  });
}

/**
 * POST /api/admin/bulk/stuck-signups   body: { id?: string }
 *
 * Sends the finish-signup reminder to the next batch of eligible people (never
 * reminded, signed up 24h+ ago), or to one person when `id` is given. Returns
 * `remaining` so the caller can keep going. Full admins only.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const singleId = typeof body?.id === "string" ? body.id : null;

  const templateCheck = await fetchTemplateWithActiveCheck(REMINDER_SLUG);
  if (!templateCheck.template) {
    return NextResponse.json({ error: "Email template not found", code: "TEMPLATE_NOT_FOUND" }, { status: 400 });
  }
  if (!templateCheck.isActive) {
    return NextResponse.json(
      { error: "Email template is not active. Enable it in the Email Templates admin page.", code: "TEMPLATE_INACTIVE" },
      { status: 400 },
    );
  }
  if (!(await getPreRenderedHtmlAdmin(REMINDER_SLUG, {}))) {
    return NextResponse.json(
      { error: "Email template has no published content. Publish it in the Email Templates builder.", code: "NO_PUBLISHED_CONTENT" },
      { status: 400 },
    );
  }

  const { rows, error } = await loadStuck();
  if (error) return NextResponse.json({ error }, { status: 500 });

  const now = Date.now();
  let targets: StuckSignup[];
  if (singleId) {
    const row = rows.find((r) => r.id === singleId);
    if (!row) return NextResponse.json({ error: "Not in the stuck-signups list" }, { status: 404 });
    if (row.last_reminder_at) return NextResponse.json({ error: "Already reminded" }, { status: 409 });
    targets = [row];
  } else {
    targets = rows.filter((r) => isEligible(r, now)).slice(0, BATCH_SIZE);
  }

  const result = { sent: 0, failed: 0, errors: [] as { email: string; error: string }[] };

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    const sendResult = await sendIncompleteMemberEmail({ to: row.email, name: "there" });
    if (sendResult.success) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push({ email: row.email, error: sendResult.error || "Failed to send" });
    }
    if (i < targets.length - 1) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  // Failures aren't recorded as reminded, so stop the caller looping on them.
  const remaining = singleId ? 0 : rows.filter((r) => isEligible(r, now)).length - targets.length;
  return NextResponse.json({ ...result, remaining: Math.max(0, remaining) });
}

import { blockIfViewingAs } from "@/lib/view-as";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import getAdminClient from "@/lib/supabase/admin";
import {
  GRANT_DOCS_ALLOWED_TYPES,
  GRANT_DOCS_BUCKET,
  GRANT_DOCS_MAX_BYTES,
  sanitizeFileName,
  validateUploadMeta,
} from "@/lib/admin-documents";
import { checkCycleEligibility, CYCLE_LOCK_COLUMNS } from "@/lib/grant-eligibility";

/**
 * POST /api/grants/upload-document/prepare
 * Body: { grantId? OR cycleId?, fileName, mimeType, fileSize }
 * Member-authenticated. Returns a signed upload URL into the PRIVATE
 * grant-documents bucket.
 *
 * Two modes:
 *  - { grantId } — legacy flow: a grants row already exists; the path is
 *    `${grantId}/…` and ownership is validated against the grants row.
 *  - { cycleId } — upload-first flow (2026-09-23): files are uploaded
 *    BEFORE the grant row is created. Path is `${cycleId}/pending/…` and
 *    membership is validated against the cycle. The grant row is created
 *    separately and /api/grants/create moves the pending file into the
 *    grant's folder (or inserts grant_documents rows referencing the
 *    pending paths).
 *
 * Replaces the legacy /api/grants/upload-document (multipart) flow so files
 * over Vercel's 4.5 MB Serverless request body limit can succeed.
 */
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const viewAsBlocked = blockIfViewingAs(request);
  if (viewAsBlocked) return viewAsBlocked;

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const grantId = typeof body.grantId === "string" ? body.grantId : "";
  const cycleId = typeof body.cycleId === "string" ? body.cycleId : "";
  if (!grantId && !cycleId) {
    return NextResponse.json({ error: "Missing grantId or cycleId" }, { status: 400 });
  }
  if (grantId && cycleId) {
    return NextResponse.json({ error: "Provide grantId OR cycleId, not both" }, { status: 400 });
  }

  const validated = validateUploadMeta(body, GRANT_DOCS_ALLOWED_TYPES, GRANT_DOCS_MAX_BYTES);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const admin = getAdminClient();

  if (grantId) {
    // Legacy flow: validate ownership against the grants row.
    const { data: grant, error: grantError } = await admin
      .from("grants")
      .select("id, user_id")
      .eq("id", grantId)
      .maybeSingle();
    if (grantError) {
      console.error("[grants/upload-document/prepare] grant lookup error:", grantError);
      return NextResponse.json({ error: grantError.message }, { status: 500 });
    }
    if (!grant) {
      return NextResponse.json({ error: "Grant application not found" }, { status: 404 });
    }
    if (grant.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const path = `${grantId}/${Date.now()}-${sanitizeFileName(validated.meta.fileName)}`;
    const { data, error } = await admin.storage
      .from(GRANT_DOCS_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[grants/upload-document/prepare] signed url error:", error);
      return NextResponse.json(
        { error: error?.message || "Could not create upload URL" },
        { status: 500 },
      );
    }
    return NextResponse.json({ path: data.path, token: data.token });
  }

  // cycleId flow: validate membership via profile; verify cycle exists & is open.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_admin, membership_level, is_approved_free_member, profile_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[grants/upload-document/prepare] profile lookup error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile?.profile_completed) {
    return NextResponse.json({ error: "Profile incomplete" }, { status: 403 });
  }

  const { data: cycle, error: cycleError } = await admin
    .from("grant_cycles")
    .select(`id, status, is_testing_only, end_date, ${CYCLE_LOCK_COLUMNS}`)
    .eq("id", cycleId)
    .maybeSingle();
  if (cycleError) {
    console.error("[grants/upload-document/prepare] cycle lookup error:", cycleError);
    return NextResponse.json({ error: cycleError.message }, { status: 500 });
  }
  if (!cycle) {
    return NextResponse.json({ error: "Grant cycle not found" }, { status: 404 });
  }
  // Late Submission Passes (migration 196): a closed cycle is allowed
  // through only if the member holds a live pass and first review isn't
  // locked. Everyone else gets the unchanged CYCLE_NOT_OPEN response.
  const eligibility = await checkCycleEligibility(user.id, cycle);
  if (!eligibility.ok) {
    // 2026-09-23: cycle-closed UX. The form (Part B of this change)
    // uses `code` + `cycleStatus` + `cycleEndDate` to render a clear,
    // actionable error and a "Back to all cycles" CTA. Members hit
    // this path when the cron in supabase/migrations/086_auto_open_close_grant_cycles.sql
    // closed the cycle while they had a form open in another tab.
    return NextResponse.json(
      {
        error:
          cycle.status === "closed"
            ? "This grant cycle closed while you were filling out your application. Your files weren't uploaded. Pick a different cycle to continue."
            : `This grant cycle is currently "${cycle.status}". Please pick a different cycle.`,
        code: "CYCLE_NOT_OPEN",
        cycleStatus: cycle.status,
        cycleEndDate: cycle.end_date,
      },
      { status: 400 },
    );
  }
  if (cycle.is_testing_only && !profile.is_admin) {
    return NextResponse.json({ error: "Cycle not available" }, { status: 403 });
  }

  // Note: duplicate-application prevention lives in /api/grants/create
  // (where the grants row is actually INSERTed) and at the unique
  // constraint on grants.(user_id, cycle_id). We intentionally do NOT
  // block at prepare time — prepare is a storage-IO helper, and a
  // member with a real, completed previous application needs to be
  // able to retry a failed prepare (e.g. network blip mid-upload,
  // browser refresh) without seeing a confusing 409 in the middle of
  // their upload flow. The create API's 409 surfaces cleanly at the
  // natural end of the flow if there's truly nothing to do.
  const path = `${cycleId}/pending/${user.id}/${Date.now()}-${sanitizeFileName(validated.meta.fileName)}`;

  const { data, error } = await admin.storage
    .from(GRANT_DOCS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[grants/upload-document/prepare] signed url error:", error);
    return NextResponse.json(
      { error: error?.message || "Could not create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

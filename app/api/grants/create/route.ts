import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  GRANT_DOCS_BUCKET,
  GRANT_DOCS_ALLOWED_TYPES,
  GRANT_DOCS_MAX_BYTES,
  storageObjectExists,
} from "@/lib/admin-documents";

interface DocumentUpload {
  path: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

function validateUploadMeta(
  up: DocumentUpload,
): { ok: true } | { ok: false; error: string } {
  if (!up.path || up.path.includes("..") || up.path.startsWith("/")) {
    return { ok: false, error: "Invalid document path" };
  }
  if (!up.fileName || typeof up.fileName !== "string") {
    return { ok: false, error: "Missing file name" };
  }
  if (!up.mimeType || !GRANT_DOCS_ALLOWED_TYPES.includes(up.mimeType)) {
    return { ok: false, error: "File type not supported" };
  }
  if (typeof up.fileSize !== "number" || up.fileSize <= 0 || up.fileSize > GRANT_DOCS_MAX_BYTES) {
    return { ok: false, error: "File size invalid" };
  }
  return { ok: true };
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 120s — was 15s but the inline AI eval (Promise.race with 6s timeout) was
// cutting things too tight when the submit handler also does cycle lookup,
// profile update, grant insert and document upload serially. 2026-09-20
// bump.
//
// 2026-09-21: the inline AI eval was removed entirely (replaced by a queue
// row + cron). This makes the worker exit as soon as the response streams,
// so Vercel can no longer kill the response mid-flight. The 120s ceiling
// now applies only to the cycle lookup, profile fetch, grant insert,
// fire-and-forget email, and queue insert (sub-second in practice).
export const maxDuration = 120;

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hardened: a malformed JSON body used to fall through to the outer
    // catch which returned a generic 500 (HTML body). Form submitted that
    // to Slack as "The string did not match the expected pattern." 2026-09-21.
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const {
      cycle_id,
      who_are_you,
      biggest_challenge,
      fund_usage,
      certification_consent,
      document_uploads,
    } = body as {
      cycle_id?: unknown;
      who_are_you?: unknown;
      biggest_challenge?: unknown;
      fund_usage?: unknown;
      certification_consent?: unknown;
      document_uploads?: unknown;
    };

    if (typeof cycle_id !== "string" || !isValidUUID(cycle_id)) {
      return NextResponse.json(
        { error: "Invalid cycle ID" },
        { status: 400 },
      );
    }

    if (!who_are_you || typeof who_are_you !== "string" || who_are_you.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a description of at least 10 characters" },
        { status: 400 },
      );
    }

    if (!biggest_challenge || typeof biggest_challenge !== "string" || biggest_challenge.trim().length < 10) {
      return NextResponse.json(
        { error: "Please describe your challenge in at least 10 characters" },
        { status: 400 },
      );
    }

    if (!fund_usage || typeof fund_usage !== "string" || fund_usage.trim().length < 10) {
      return NextResponse.json(
        { error: "Please describe fund usage in at least 10 characters" },
        { status: 400 },
      );
    }

    if (!certification_consent) {
      return NextResponse.json(
        { error: "You must certify your eligibility to submit a grant application" },
        { status: 400 },
      );
    }

    // Parse + validate document_uploads (upload-first flow, 2026-09-23).
    // Each path must follow the upload-first convention
    // `${cycle_id}/pending/${user.id}/...` to prevent cross-tenant
    // smuggling of forged document paths from a different user's bucket.
    const documentUploads: DocumentUpload[] = Array.isArray(document_uploads)
      ? (document_uploads as DocumentUpload[]).filter(
          (u): u is DocumentUpload =>
            !!u && typeof u === "object" &&
            typeof u.path === "string" &&
            typeof u.fileName === "string" &&
            typeof u.mimeType === "string" &&
            typeof u.fileSize === "number",
        )
      : [];
    const allowedPrefix = `${cycle_id}/pending/${user.id}/`;
    for (const up of documentUploads) {
      if (!up.path.startsWith(allowedPrefix)) {
        return NextResponse.json(
          { error: "Invalid document path" },
          { status: 400 },
        );
      }
      const v = validateUploadMeta(up);
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
    }

    const { data: cycleData } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, status, is_testing_only, requires_documents")
      .eq("id", cycle_id)
      .single();

    if (!cycleData) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    if (cycleData.status !== "open") {
      return NextResponse.json(
        { error: "This grant cycle is not accepting applications" },
        { status: 400 },
      );
    }

    // Server-side enforcement (was previously only client-side). Members
    // who bypass the form (curl, JS-disabled, future API clients) cannot
    // submit a zero-document application to a requires_documents cycle.
    if (cycleData.requires_documents && documentUploads.length === 0) {
      return NextResponse.json(
        { error: "This grant cycle requires at least one supporting document" },
        { status: 400 },
      );
    }

    // Defense-in-depth: prevent non-admins from applying to testing-only cycles
    if (cycleData.is_testing_only) {
      // Check if user is admin
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json(
          { error: "This grant cycle is not available" },
          { status: 403 },
        );
      }
      // Admins can apply to testing-only cycles for testing purposes
    }

    // Check if user already applied for this cycle
    const { data: existing } = await supabaseAdmin
      .from("grants")
      .select("id")
      .eq("user_id", user.id)
      .eq("cycle_id", cycle_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this grant cycle." },
        { status: 409 },
      );
    }

    const { data: grant, error } = await supabaseAdmin
      .from("grants")
      .insert({
        user_id: user.id,
        cycle_id,
        who_are_you: who_are_you.trim(),
        biggest_challenge: biggest_challenge.trim(),
        fund_usage: fund_usage.trim(),
        is_nominating: false,
        nominee_name: null,
        nominee_email: null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        consent_version: "v1",
        consent_given_at: new Date().toISOString(),
        certification_consent: Boolean(certification_consent),
      })
      .select()
      .single();

    if (error) {
      // Surface every field PostgREST gives us so future incidents
      // can be diagnosed from Vercel logs without spelunking.
      // (Previously we logged `message` only — that hid the
      // `code` and meant every Slack alert read as raw Postgres text.)
      console.error("[grants/create] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // Sanitized payload — lengths, not text. Lengths alone are enough
      // to diagnose CHECK/char_length failures (e.g., essay under 10
      // chars) without leaking PII to logs.
      console.error("[grants/create] Sanitized payload:", {
        user_id: user.id,
        cycle_id,
        who_are_you_len: typeof who_are_you === "string" ? who_are_you.trim().length : 0,
        biggest_challenge_len: typeof biggest_challenge === "string" ? biggest_challenge.trim().length : 0,
        fund_usage_len: typeof fund_usage === "string" ? fund_usage.trim().length : 0,
        certification_consent: Boolean(certification_consent),
      });
      // Map common Postgres codes to user-friendly text. Anything
      // unknown falls back to the raw message so we don't hide
      // genuinely new failure modes from the user (and from support).
      const friendly =
        error.code === "22P02"
          ? "We couldn't process one of your answers. Please refresh and try again."
          : error.code === "23505"
            ? "You've already applied to this grant cycle."
            : error.code === "23514"
              ? "One of your answers didn't meet the minimum length. Please review and resubmit."
              : error.code === "23502"
                ? "One of the required fields was missing. Please refresh and try again."
                : error.code === "42501"
                  ? "You don't have permission to submit. Please contact support."
                  : "Failed to submit grant application. Please try again or contact support.";
      return NextResponse.json(
        { error: friendly, code: error.code },
        { status: error.code === "22P02" || error.code === "23514" ? 400 : error.code === "23505" ? 409 : 500 },
      );
    }

    // Atomic grant_documents inserts. Each path was previously verified
    // by the form's signed URL upload; we double-check existence here to
    // close the forged-path attack surface (member A claiming to upload
    // a file under member B's cycle folder). If any insert fails, we
    // roll back the grant row so the user is never left with an
    // orphan grant that the apply form would then block them from
    // re-submitting (409).
    if (documentUploads.length > 0) {
      const existenceResults = await Promise.all(
        documentUploads.map((up) => storageObjectExists(supabaseAdmin, GRANT_DOCS_BUCKET, up.path)),
      );
      if (existenceResults.some((exists) => !exists)) {
        // Roll back the grant row before returning.
        await supabaseAdmin.from("grants").delete().eq("id", grant.id);
        return NextResponse.json(
          { error: "One or more uploaded files could not be verified in storage. Please try uploading again." },
          { status: 400 },
        );
      }

      const docRows = documentUploads.map((up) => ({
        grant_id: grant.id,
        document_type: "supporting_doc",
        document_url: up.path,
        file_name: up.fileName,
        file_size: up.fileSize,
      }));

      const { error: docsError } = await supabaseAdmin
        .from("grant_documents")
        .insert(docRows);

      if (docsError) {
        console.error("[grants/create] grant_documents insert failed, rolling back grant:", docsError);
        // Best-effort rollback of the grant row. If this DELETE also
        // fails, the orphan-grant cleanup cron (added 2026-09-23) will
        // surface it in the daily Slack report.
        await supabaseAdmin.from("grants").delete().eq("id", grant.id);
        // Best-effort cleanup of the storage objects so we don't leak
        // uploads for a grant that no longer exists.
        try {
          await supabaseAdmin.storage
            .from(GRANT_DOCS_BUCKET)
            .remove(documentUploads.map((up) => up.path));
        } catch (cleanupErr) {
          console.error("[grants/create] storage cleanup after rollback failed:", cleanupErr);
        }
        return NextResponse.json(
          { error: "Failed to attach supporting documents. Please try again or contact support." },
          { status: 500 },
        );
      }
    }

    // Fetch user email and profile for the confirmation email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.id);

    if (profile && userData?.user?.email) {
      // Fetch grant cycle name + description for the confirmation email
      const { data: cycle } = await supabaseAdmin
        .from("grant_cycles")
        .select("cycle_name, description")
        .eq("id", cycle_id)
        .single();

      // Fire-and-forget confirmation email — does not block the response.
      import("@/lib/email").then(({ sendGrantApplicationReceivedEmail }) => {
        sendGrantApplicationReceivedEmail({
          to: userData.user!.email!,
          name: profile.full_name || "there",
          grantCycleName: cycle?.cycle_name || "the grant",
          applicationId: grant.id,
        }).catch(console.error);
      });
    }

    // AI evaluation is now queued (2026-09-21) instead of inlined in
    // the request worker. The previous inline Anthropic call could not
    // finish before Vercel killed the response stream on slow Anthropic
    // responses, which surfaced to the user as "The string did not
    // match the expected pattern." (the browser-level JSON.parse error
    // when the upstream response was an HTML 504 page).
    //
    // The grant row is now written synchronously before the queue row.
    // If the queue insert fails (e.g. ANTHROPIC_API_KEY missing, network
    // hiccup), we log and continue — the user still gets a successful
    // submission, and the existing app/api/cron/ai-evaluate-pending
    // worker (every 5 min) will pick up any rows that never got queued
    // by scanning for NULL ai_relevance.
    const { error: queueErr } = await supabaseAdmin
      .from("grant_ai_eval_queue")
      .insert({ grant_id: grant.id, cycle_id })
      .select("id")
      .single();

    if (queueErr) {
      // 23505 = unique_violation (already queued; OK to ignore)
      if (queueErr.code !== "23505") {
        console.error(
          "[grants/create] queue insert failed (will be picked up by ai-evaluate-pending backfill):",
          { code: queueErr.code, message: queueErr.message },
        );
      }
    }

    return NextResponse.json({
      success: true,
      grantId: grant.id,
    });
  } catch (err) {
    console.error("[grants/create] Unexpected error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}

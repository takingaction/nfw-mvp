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

/**
 * POST /api/grants/upload-document/prepare
 * Body: { grantId, fileName, mimeType, fileSize }
 * Member-authenticated. Returns a signed upload URL into the PRIVATE
 * grant-documents bucket under `${grantId}/…` so the existing signed-URL
 * viewer (/api/grants/document-url) works unchanged.
 *
 * Replaces the legacy /api/grants/upload-document (multipart) flow so files
 * over Vercel's 4.5 MB Serverless request body limit can succeed.
 */
export const maxDuration = 10;

export async function POST(request: NextRequest) {
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
  if (!grantId) {
    return NextResponse.json({ error: "Missing grantId" }, { status: 400 });
  }

  const validated = validateUploadMeta(body, GRANT_DOCS_ALLOWED_TYPES, GRANT_DOCS_MAX_BYTES);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const admin = getAdminClient();

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

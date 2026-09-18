import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import {
  GRANT_DOCS_ALLOWED_TYPES,
  GRANT_DOCS_BUCKET,
  GRANT_DOCS_MAX_BYTES,
  sanitizeFileName,
  validateUploadMeta,
} from "@/lib/admin-documents";

/**
 * POST /api/admin/grants/documents/prepare
 * Body: { grantId, fileName, mimeType, fileSize }
 * Admin-only. Returns a signed upload URL into the PRIVATE grant-documents bucket
 * under `${grantId}/…` — same layout as member uploads, so existing signed-URL
 * viewing (/api/grants/document-url) works unchanged.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

  const supabase = getAdminClient();

  const { data: grant, error: grantError } = await supabase
    .from("grants")
    .select("id")
    .eq("id", grantId)
    .maybeSingle();
  if (grantError) {
    console.error("[admin/grants/documents/prepare] grant lookup error:", grantError);
    return NextResponse.json({ error: grantError.message }, { status: 500 });
  }
  if (!grant) {
    return NextResponse.json({ error: "Grant application not found" }, { status: 404 });
  }

  const path = `${grantId}/${Date.now()}-${sanitizeFileName(validated.meta.fileName)}`;

  const { data, error } = await supabase.storage
    .from(GRANT_DOCS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[admin/grants/documents/prepare] signed url error:", error);
    return NextResponse.json(
      { error: error?.message || "Could not create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

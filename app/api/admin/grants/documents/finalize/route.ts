import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import {
  GRANT_DOCS_ALLOWED_TYPES,
  GRANT_DOCS_BUCKET,
  GRANT_DOCS_MAX_BYTES,
  storageObjectExists,
  validateUploadMeta,
} from "@/lib/admin-documents";

/**
 * POST /api/admin/grants/documents/finalize
 * Body: { grantId, path, fileName, mimeType, fileSize }
 * Verifies the object exists, then inserts the grant_documents row with
 * uploaded_by = admin (NULL means the member uploaded it).
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
  const path = typeof body.path === "string" ? body.path : "";
  if (!grantId || !path) {
    return NextResponse.json({ error: "Missing grantId or path" }, { status: 400 });
  }
  // Path must live under this grant's folder
  if (!path.startsWith(`${grantId}/`)) {
    return NextResponse.json({ error: "Path does not belong to this grant" }, { status: 400 });
  }

  const validated = validateUploadMeta(body, GRANT_DOCS_ALLOWED_TYPES, GRANT_DOCS_MAX_BYTES);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: grant } = await supabase
    .from("grants")
    .select("id")
    .eq("id", grantId)
    .maybeSingle();
  if (!grant) {
    return NextResponse.json({ error: "Grant application not found" }, { status: 404 });
  }

  const exists = await storageObjectExists(supabase, GRANT_DOCS_BUCKET, path);
  if (!exists) {
    return NextResponse.json(
      { error: "Uploaded file not found in storage. Please try again." },
      { status: 400 },
    );
  }

  const { data: row, error } = await supabase
    .from("grant_documents")
    .insert({
      grant_id: grantId,
      document_type: "admin_upload",
      document_url: path,
      file_name: validated.meta.fileName,
      file_size: validated.meta.fileSize,
      uploaded_by: admin.user.id,
    })
    .select("id, grant_id, document_type, document_url, file_name, file_size, uploaded_at, created_at, uploaded_by")
    .single();

  if (error || !row) {
    console.error("[admin/grants/documents/finalize] insert error:", error);
    await supabase.storage.from(GRANT_DOCS_BUCKET).remove([path]);
    return NextResponse.json(
      { error: error?.message || "Could not save document" },
      { status: 500 },
    );
  }

  return NextResponse.json(row);
}

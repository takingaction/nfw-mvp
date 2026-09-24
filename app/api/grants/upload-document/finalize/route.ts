import { blockIfViewingAs } from "@/lib/view-as";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import getAdminClient from "@/lib/supabase/admin";
import {
  GRANT_DOCS_ALLOWED_TYPES,
  GRANT_DOCS_BUCKET,
  GRANT_DOCS_MAX_BYTES,
  storageObjectExists,
  validateUploadMeta,
} from "@/lib/admin-documents";

/**
 * POST /api/grants/upload-document/finalize
 * Body: { grantId, path, fileName, mimeType, fileSize }
 * Member-authenticated. Verifies the object exists in storage and inserts the
 * grant_documents row. Path is constrained to ${grantId}/… so a member can't
 * finalize an upload into someone else's folder.
 *
 * uploaded_by is left NULL — that field flags admin-attached docs (see
 * app/api/admin/grants/documents/finalize).
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
  const path = typeof body.path === "string" ? body.path : "";
  if (!grantId || !path) {
    return NextResponse.json({ error: "Missing grantId or path" }, { status: 400 });
  }
  if (!path.startsWith(`${grantId}/`)) {
    return NextResponse.json({ error: "Path does not belong to this grant" }, { status: 400 });
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
    console.error("[grants/upload-document/finalize] grant lookup error:", grantError);
    return NextResponse.json({ error: grantError.message }, { status: 500 });
  }
  if (!grant) {
    return NextResponse.json({ error: "Grant application not found" }, { status: 404 });
  }
  if (grant.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exists = await storageObjectExists(admin, GRANT_DOCS_BUCKET, path);
  if (!exists) {
    return NextResponse.json(
      { error: "Uploaded file not found in storage. Please try again." },
      { status: 400 },
    );
  }

  const { data: row, error } = await admin
    .from("grant_documents")
    .insert({
      grant_id: grantId,
      document_type: "supporting_doc",
      document_url: path,
      file_name: validated.meta.fileName,
      file_size: validated.meta.fileSize,
    })
    .select("id, grant_id, document_type, document_url, file_name, file_size, uploaded_at, created_at")
    .single();

  if (error || !row) {
    console.error("[grants/upload-document/finalize] insert error:", error);
    // Best-effort cleanup so we don't leak a stored object with no DB row.
    await admin.storage.from(GRANT_DOCS_BUCKET).remove([path]);
    return NextResponse.json(
      { error: error?.message || "Could not save document" },
      { status: 500 },
    );
  }

  return NextResponse.json(row);
}

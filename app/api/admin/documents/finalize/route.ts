import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import {
  ADMIN_DOCS_ALLOWED_TYPES,
  ADMIN_DOCS_BUCKET,
  ADMIN_DOCS_MAX_BYTES,
  storageObjectExists,
  validateUploadMeta,
} from "@/lib/admin-documents";

/**
 * POST /api/admin/documents/finalize
 * Body: { path, fileName, mimeType, fileSize }
 * Verifies the object landed in storage and inserts the tracking row.
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

  const validated = validateUploadMeta(body, ADMIN_DOCS_ALLOWED_TYPES, ADMIN_DOCS_MAX_BYTES);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path : "";
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const supabase = getAdminClient();

  const exists = await storageObjectExists(supabase, ADMIN_DOCS_BUCKET, path);
  if (!exists) {
    return NextResponse.json(
      { error: "Uploaded file not found in storage. Please try again." },
      { status: 400 },
    );
  }

  const { data: urlData } = supabase.storage.from(ADMIN_DOCS_BUCKET).getPublicUrl(path);

  const { data: row, error } = await supabase
    .from("admin_documents")
    .insert({
      file_name: validated.meta.fileName,
      storage_path: path,
      public_url: urlData.publicUrl,
      mime_type: validated.meta.mimeType,
      file_size: validated.meta.fileSize,
      uploaded_by: admin.user.id,
    })
    .select("id, file_name, storage_path, public_url, mime_type, file_size, created_at, uploaded_by")
    .single();

  if (error || !row) {
    console.error("[admin/documents/finalize] insert error:", error);
    // Don't leave an orphaned object behind
    await supabase.storage.from(ADMIN_DOCS_BUCKET).remove([path]);
    return NextResponse.json(
      { error: error?.message || "Could not save document" },
      { status: 500 },
    );
  }

  const { data: uploader } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", admin.user.id)
    .maybeSingle();

  return NextResponse.json({
    ...row,
    uploaded_by_name: uploader?.full_name || uploader?.email || admin.user.email || null,
  });
}

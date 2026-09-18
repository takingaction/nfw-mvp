import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { ADMIN_DOCS_BUCKET } from "@/lib/admin-documents";

/**
 * DELETE /api/admin/documents/[id]
 * Removes the storage object, then the tracking row.
 * Any hyperlinks pointing at the public URL will break — the UI warns before calling this.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getAdminClient();

  const { data: doc, error: fetchError } = await supabase
    .from("admin_documents")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/documents/delete] fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from(ADMIN_DOCS_BUCKET)
    .remove([doc.storage_path]);
  if (storageError) {
    // Log but continue — a missing object shouldn't block cleanup of the row
    console.error("[admin/documents/delete] storage remove error:", storageError);
  }

  const { error: deleteError } = await supabase
    .from("admin_documents")
    .delete()
    .eq("id", id);
  if (deleteError) {
    console.error("[admin/documents/delete] row delete error:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

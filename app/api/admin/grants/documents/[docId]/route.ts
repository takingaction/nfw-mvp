import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { GRANT_DOCS_BUCKET } from "@/lib/admin-documents";

/**
 * DELETE /api/admin/grants/documents/[docId]
 * Removes an ADMIN-attached grant document (storage object + row).
 * Member-uploaded documents (uploaded_by IS NULL) cannot be deleted here.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { docId } = await params;
  const supabase = getAdminClient();

  const { data: doc, error: fetchError } = await supabase
    .from("grant_documents")
    .select("id, document_url, uploaded_by")
    .eq("id", docId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin/grants/documents/delete] fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!doc.uploaded_by) {
    return NextResponse.json(
      { error: "Only admin-attached documents can be removed" },
      { status: 403 },
    );
  }

  const { error: storageError } = await supabase.storage
    .from(GRANT_DOCS_BUCKET)
    .remove([doc.document_url]);
  if (storageError) {
    console.error("[admin/grants/documents/delete] storage remove error:", storageError);
  }

  const { error: deleteError } = await supabase
    .from("grant_documents")
    .delete()
    .eq("id", docId);
  if (deleteError) {
    console.error("[admin/grants/documents/delete] row delete error:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

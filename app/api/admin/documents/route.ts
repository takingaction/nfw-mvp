import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

const PAGE_SIZE = 50;

/**
 * GET /api/admin/documents?search=&page=
 * Lists the admin document library (admin_documents table), newest first.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getAdminClient();
  let query = supabase
    .from("admin_documents")
    .select(
      "id, file_name, storage_path, public_url, mime_type, file_size, created_at, uploaded_by, profiles:uploaded_by (full_name, email)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    // Escape % and _ so they're literal in ilike
    const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.ilike("file_name", `%${escaped}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin/documents] list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents = (data || []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      file_name: row.file_name,
      storage_path: row.storage_path,
      public_url: row.public_url,
      mime_type: row.mime_type,
      file_size: row.file_size,
      created_at: row.created_at,
      uploaded_by: row.uploaded_by,
      uploaded_by_name: profile?.full_name || profile?.email || null,
    };
  });

  return NextResponse.json({
    documents,
    total: count ?? documents.length,
    page,
    pageSize: PAGE_SIZE,
  });
}

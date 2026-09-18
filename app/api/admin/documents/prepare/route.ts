import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import {
  ADMIN_DOCS_ALLOWED_TYPES,
  ADMIN_DOCS_BUCKET,
  ADMIN_DOCS_MAX_BYTES,
  sanitizeFileName,
  validateUploadMeta,
} from "@/lib/admin-documents";

/**
 * POST /api/admin/documents/prepare
 * Body: { fileName, mimeType, fileSize }
 * Validates and returns a signed upload URL for the public admin-documents bucket.
 * The browser uploads directly to storage (bypassing Vercel's 4.5 MB body limit),
 * then calls /finalize to record the row.
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

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${yyyy}/${mm}/${Date.now()}-${sanitizeFileName(validated.meta.fileName)}`;

  const { data, error } = await getAdminClient()
    .storage.from(ADMIN_DOCS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[admin/documents/prepare] signed url error:", error);
    return NextResponse.json(
      { error: error?.message || "Could not create upload URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

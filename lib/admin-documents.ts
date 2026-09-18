/**
 * Server-side constants + helpers shared by the admin document upload routes.
 * (Route files can't export non-handler symbols, so these live here.)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_DOCS_BUCKET = "admin-documents";
export const ADMIN_DOCS_MAX_BYTES = 25 * 1024 * 1024; // must match bucket file_size_limit
export const ADMIN_DOCS_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
];

// Mirrors app/api/grants/upload-document/route.ts (member upload)
export const GRANT_DOCS_BUCKET = "grant-documents";
export const GRANT_DOCS_MAX_BYTES = 10 * 1024 * 1024;
export const GRANT_DOCS_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface UploadMeta {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/** Returns an error string or null. */
export function validateUploadMeta(
  body: Record<string, unknown>,
  allowedTypes: string[],
  maxBytes: number,
): { ok: true; meta: UploadMeta } | { ok: false; error: string } {
  const { fileName, mimeType, fileSize } = body;
  if (!fileName || typeof fileName !== "string") {
    return { ok: false, error: "Missing file name" };
  }
  if (!mimeType || typeof mimeType !== "string") {
    return { ok: false, error: "Missing file type" };
  }
  if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0) {
    return { ok: false, error: "Missing file size" };
  }
  if (!allowedTypes.includes(mimeType)) {
    return { ok: false, error: `File type not supported (${mimeType})` };
  }
  if (fileSize > maxBytes) {
    return {
      ok: false,
      error: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB)`,
    };
  }
  return { ok: true, meta: { fileName, mimeType, fileSize } };
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/**
 * Confirms an object exists in a bucket after a signed-URL upload.
 * Rejects paths that escape their folder.
 */
export async function storageObjectExists(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<boolean> {
  if (!path || path.includes("..") || path.startsWith("/")) return false;
  const slash = path.lastIndexOf("/");
  const dir = slash === -1 ? "" : path.slice(0, slash);
  const base = slash === -1 ? path : path.slice(slash + 1);
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(dir, { search: base, limit: 10 });
  if (error || !data) return false;
  return data.some((f) => f.name === base);
}

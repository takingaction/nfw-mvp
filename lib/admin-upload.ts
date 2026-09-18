import { createClient } from "@supabase/supabase-js";

/**
 * Three-step signed-URL upload used by admin document features.
 *
 * 1. POST `prepareUrl`  -> server validates + returns { path, token }
 * 2. Browser uploads straight to Supabase Storage with the signed token
 *    (bypasses Vercel's 4.5 MB request body limit; token is the credential,
 *    no session needed — same approach as lib/upload.ts)
 * 3. POST `finalizeUrl` -> server verifies the object exists and inserts the DB row
 *
 * `extra` is merged into both server calls (e.g. `{ grantId }`).
 */
export async function uploadWithSignedUrl<T = unknown>({
  prepareUrl,
  finalizeUrl,
  bucket,
  file,
  extra = {},
}: {
  prepareUrl: string;
  finalizeUrl: string;
  bucket: string;
  file: File;
  extra?: Record<string, unknown>;
}): Promise<T> {
  const meta = {
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    ...extra,
  };

  // Step 1: prepare
  const prepRes = await fetch(prepareUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  const prep = await prepRes.json();
  if (!prepRes.ok) {
    throw new Error(prep.error ?? "Could not start upload");
  }
  const { path, token } = prep as { path: string; token: string };

  // Step 2: direct browser upload
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Step 3: finalize
  const finRes = await fetch(finalizeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...meta, path }),
  });
  const fin = await finRes.json();
  if (!finRes.ok) {
    throw new Error(fin.error ?? "Could not save document");
  }
  return fin as T;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

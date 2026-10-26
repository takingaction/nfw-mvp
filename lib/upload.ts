import { createClient } from "@supabase/supabase-js";

// Longest edge we keep for CMS images. Must stay >= MAX_EDGE in lib/image-optimize.ts
// (the server does the final resize + WebP encode).
const CLIENT_MAX_EDGE = 2400;
const CLIENT_RESIZE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Shrink large photos in the browser before upload so camera/Unsplash originals
 * (often 5-10 MB) fit under Vercel's 4.5 MB request limit. The server
 * re-encodes the result anyway, so a high quality setting is used here.
 * Falls back to the original file if anything goes wrong.
 */
async function downscaleForUpload(file: File): Promise<File> {
  if (!CLIENT_RESIZE_TYPES.includes(file.type) || typeof createImageBitmap !== "function") {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    // Small enough already: send as-is.
    if (scale === 1 && file.size <= 3 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.92),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

export async function uploadImage(
  file: File,
  folder: string = "sections",
): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  if (!isVideo) {
    file = await downscaleForUpload(file);
  }

  // For large videos, use Supabase client directly from browser
  // This bypasses Vercel's 4.5MB limit and SDK handles CORS automatically
  if (isVideo && file.size > 4 * 1024 * 1024) {
    const ext = file.name.split(".").pop() || "bin";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${sanitizedName.endsWith(`.${ext}`) ? sanitizedName : `${sanitizedName}.${ext}`}`;

    // Use Supabase browser client directly - it handles CORS automatically
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data, error } = await supabase.storage
      .from("page-builder")
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Return the public URL
    const { data: urlData } = supabase.storage
      .from("page-builder")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  // For images and smaller files, upload normally through API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Upload failed");
  }

  return data.url;
}

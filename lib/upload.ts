import { createClient } from "@supabase/supabase-js";

export async function uploadImage(
  file: File,
  folder: string = "sections",
): Promise<string> {
  const isVideo = file.type.startsWith("video/");

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
      console.error("Supabase upload error:", error);
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

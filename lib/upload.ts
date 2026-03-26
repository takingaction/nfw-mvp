export async function uploadImage(
  file: File,
  folder: string = "sections",
): Promise<string> {
  const isVideo = file.type.startsWith("video/");

  // For large videos, use signed URL approach to bypass Vercel's 4.5MB limit
  if (isVideo && file.size > 4 * 1024 * 1024) {
    // First, get a signed URL from our API
    const ext = file.name.split(".").pop() || "bin";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${sanitizedName.endsWith(`.${ext}`) ? sanitizedName : `${sanitizedName}.${ext}`}`;

    const signResponse = await fetch("/api/upload/sign-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    const signData = await signResponse.json();

    if (!signResponse.ok) {
      throw new Error(signData.error ?? "Failed to get signed URL");
    }

    console.log("Got signed URL:", signData.signedUrl);

    // Use Supabase client to upload to signed URL
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Extract token from signed URL
    const url = new URL(signData.signedUrl);
    const token = url.searchParams.get("token");
    
    if (!token) {
      throw new Error("No token in signed URL");
    }

    console.log("Uploading with token:", token.substring(0, 10) + "...");

    const { data, error } = await supabase.storage
      .from("page-builder")
      .uploadToSignedUrl(fileName, token, file, {
        contentType: file.type,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Failed to upload: ${error.message}`);
    }

    console.log("Upload successful, path:", data.path);

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

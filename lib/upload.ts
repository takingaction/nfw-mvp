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

    // Upload directly to Supabase Storage using the signed URL
    console.log("Uploading to signed URL:", signData.signedUrl);
    
    const uploadResponse = await fetch(signData.signedUrl, {
      method: "PUT",
      body: file,
    });

    console.log("Upload response status:", uploadResponse.status);

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      console.error("Supabase upload failed:", uploadResponse.status, text);
      throw new Error(`Failed to upload: ${uploadResponse.status} - ${text}`);
    }

    // Return the public URL (remove the query string from signed URL)
    const publicUrl = signData.signedUrl.split("?")[0];
    return publicUrl;
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

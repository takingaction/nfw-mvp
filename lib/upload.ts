export async function uploadImage(
  file: File,
  folder: string = "sections",
): Promise<string> {
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

  // If API returned a signed URL, upload directly to Supabase Storage
  // This bypasses Vercel's 4.5MB payload limit for large files
  if (data.signedUrl && data.token) {
    const uploadResponse = await fetch(data.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to storage");
    }

    // Return the public URL
    const publicUrl = data.signedUrl.split("?")[0];
    return publicUrl;
  }

  return data.url;
}

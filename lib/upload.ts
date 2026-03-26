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
  if (data.signedUrl) {
    const uploadResponse = await fetch(data.signedUrl, {
      method: "PUT",
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to storage");
    }

    // Return the public URL (remove the query string from signed URL)
    return data.signedUrl.split("?")[0];
  }

  return data.url;
}

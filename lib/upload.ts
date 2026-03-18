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
  console.log("Upload API response:", data);
  console.log("URL value:", data.url);
  console.log("URL type:", typeof data.url);

  if (!response.ok) {
    throw new Error(data.error ?? "Upload failed");
  }

  return data.url;
}

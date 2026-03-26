import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/ogg",
];

const IMAGE_MAX_SIZE = 3 * 1024 * 1024;  // 3MB for images
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB for videos

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) ?? "sections";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 },
      );
    }

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE;
    const fileType = isVideo ? "videos" : "images";

    if (file.size > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File size exceeds ${limitMB}MB limit for ${fileType}` },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${sanitizedName.endsWith(`.${ext}`) ? sanitizedName : `${sanitizedName}.${ext}`}`;

    // For large files (videos), use direct upload via signed URL
    // This bypasses Vercel's 4.5MB payload limit
    if (isVideo && file.size > 4 * 1024 * 1024) {
      // Create a signed upload URL
      const { data: signData, error: signError } = await supabaseAdmin.storage
        .from("page-builder")
        .createSignedUploadUrl(fileName);

      if (signError || !signData) {
        console.error("Failed to create signed URL:", signError);
        return NextResponse.json(
          { error: "Failed to initiate upload. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        signedUrl: signData.signedUrl,
        token: signData.token,
        fileName: fileName,
      });
    }

    // For smaller files (images), upload directly through API
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error } = await supabaseAdmin.storage
      .from("page-builder")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 },
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("page-builder")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "An error occurred during upload";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

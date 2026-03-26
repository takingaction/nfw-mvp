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
    // Check content-length header before processing
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 413 }
      );
    }

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let uploadError = null;
    let uploadResult = null;
    
    try {
      const uploadResponse = await Promise.race([
        supabaseAdmin.storage
          .from("page-builder")
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Upload timed out after 30 seconds")), 30000)
        )
      ]);
      uploadResult = uploadResponse;
    } catch (err: any) {
      uploadError = err;
    }

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { error: urlError } = uploadResult as { error: any };
    if (urlError) {
      console.error("Storage upload error:", urlError);
      return NextResponse.json(
        { error: `Failed to upload file: ${urlError.message}` },
        { status: 500 },
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("page-builder")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    
    // Check if error is a response from Supabase (might be HTML)
    if (err?.message?.includes("fetch failed") || err?.cause?.message?.includes("fetch failed")) {
      return NextResponse.json(
        { error: "Supabase connection failed. Please try again." },
        { status: 502 },
      );
    }
    
    // Check for timeout
    if (err?.message?.includes("timed out")) {
      return NextResponse.json(
        { error: "Upload timed out. Please try a smaller file or check your connection." },
        { status: 504 },
      );
    }
    
    const message = err instanceof Error ? err.message : "An error occurred during upload";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

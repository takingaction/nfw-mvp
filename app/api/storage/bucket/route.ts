import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
];

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bucketId } = await request.json();

    const { data, error } = await supabase.storage.updateBucket(bucketId, {
      public: true,
      allowedMimeTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

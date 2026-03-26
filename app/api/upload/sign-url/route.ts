import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB

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

    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing fileName or fileType" },
        { status: 400 }
      );
    }

    if (!ALLOWED_VIDEO_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    if (fileSize > VIDEO_MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

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
      fileName: fileName,
    });
  } catch (err: any) {
    console.error("Sign URL error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create signed URL" },
      { status: 500 }
    );
  }
}

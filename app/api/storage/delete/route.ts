import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface DeleteFileRequest {
  bucket: string;
  filename: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteFileRequest = await request.json();
    const { bucket, filename } = body;

    if (!bucket || !filename) {
      return NextResponse.json(
        { error: "Bucket and filename are required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filename]);

    if (deleteError) {
      console.error("Error deleting storage file:", deleteError);
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete storage error:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

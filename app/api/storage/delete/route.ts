import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const ALLOWED_BUCKETS = ["page-builder", "article-images", "store-items", "profile-avatars"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profile?.is_admin !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { bucket, filename } = body;

    if (!bucket || !filename) {
      return NextResponse.json(
        { error: "Bucket and filename are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

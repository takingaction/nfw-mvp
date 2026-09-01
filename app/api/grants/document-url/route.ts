import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Verify authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath, grantId } = await request.json();

    if (!filePath || !grantId) {
      return NextResponse.json(
        { error: "Missing filePath or grantId" },
        { status: 400 },
      );
    }

    // Verify the user owns this grant OR is an admin/reviewer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin, is_reviewer")
      .eq("id", user.id)
      .single();

    const { data: grant } = await supabaseAdmin
      .from("grants")
      .select("user_id")
      .eq("id", grantId)
      .single();

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    if (grant.user_id !== user.id && !profile?.is_admin && !profile?.is_reviewer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate signed URL valid for 1 hour
    const { data, error } = await supabaseAdmin.storage
      .from("grant-documents")
      .createSignedUrl(filePath, 3600);

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to generate URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}

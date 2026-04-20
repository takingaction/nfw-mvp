import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current avatar URL
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile?.avatar_url) {
      return NextResponse.json({ success: true, message: "No avatar to delete" });
    }

    // Extract filename and delete from storage
    const avatarUrl = profile.avatar_url;
    const filename = avatarUrl.split("/").pop();
    if (filename) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from("profile-avatars")
        .remove([`avatars/${filename}`]);

      if (deleteError) {
        console.error("Storage delete error:", deleteError);
        // Continue anyway - we'll still clear the profile URL
      }
    }

    // Clear avatar_url in profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to clear avatar. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
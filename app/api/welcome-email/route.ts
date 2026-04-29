import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(_request: NextRequest) {
  console.log('[welcome-email API] Starting...');
  try {
    const supabase = await createServerClient();
    console.log('[welcome-email API] Got supabase client');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('[welcome-email API] getUser result:', { userId: user?.id, email: user?.email, authError });

    if (authError || !user) {
      console.log('[welcome-email API] Unauthorized');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, membership_level")
      .eq("id", user.id)
      .single();
    console.log('[welcome-email API] Profile:', profile);

    if (!profile) {
      console.log('[welcome-email API] Profile not found');
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const firstName = profile.full_name?.split(" ")[0] || "Friend";
    const membershipType = profile.membership_level as "free" | "contributing" | "founding";
    console.log('[welcome-email API] Calling sendWelcomeEmail with type:', membershipType);

    try {
      await sendWelcomeEmail({
        to: user.email!,
        name: firstName,
        membershipType: membershipType || "free",
        memberId: user.email!,
      });
      console.log('[welcome-email API] sendWelcomeEmail completed');
    } catch (err) {
      console.error("Welcome email failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    );
  }
}
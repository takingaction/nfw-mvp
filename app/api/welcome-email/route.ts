import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, membership_level")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const firstName = profile.full_name?.split(" ")[0] || "Friend";
    const membershipType = profile.membership_level as "free" | "contributing" | "founding";

    await sendWelcomeEmail({
      to: user.email!,
      name: firstName,
      membershipType: membershipType || "free",
      memberId: user.id.slice(0, 8).toUpperCase(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    );
  }
}
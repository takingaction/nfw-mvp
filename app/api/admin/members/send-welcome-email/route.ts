import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Verify the requester is an admin
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check is_admin on the requester
    const { data: requester } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!requester?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    // Fetch member's profile and email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, membership_level")
      .eq("id", memberId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!profile.email) {
      return NextResponse.json({ error: "Member has no email" }, { status: 400 });
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: profile.email,
        name: profile.full_name || "Member",
        membershipType: profile.membership_level as "free" | "contributing" | "founding",
        memberId: profile.id,
      });
    } catch (emailError: any) {
      console.error("[send-welcome-email] Failed to send email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email", details: emailError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-welcome-email] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_EMAILS = [
  "kelsey@nationalfundforwomen.org",
  "ron@myherodesign.com",
];

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!ALLOWED_EMAILS.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { memberId, newEmail } = await request.json();

    if (!memberId)
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

    if (!newEmail)
      return NextResponse.json({ error: "Missing newEmail" }, { status: 400 });

    if (!isValidEmail(newEmail))
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });

    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(memberId);
    if (!targetUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      memberId,
      { email: newEmail }
    );

    if (updateError)
      return NextResponse.json(
        { error: `Failed to update email: ${updateError.message}` },
        { status: 500 }
      );

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", memberId);

    if (profileError) {
      console.error("[UpdateEmail] Profile update failed:", profileError);
    }

    return NextResponse.json({
      success: true,
      message: `Email updated to ${newEmail}`
    });
  } catch (err: any) {
    console.error("[UpdateEmail] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

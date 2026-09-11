import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

const ALLOWED_EMAILS = [
  "rachel@nationalfundforwomen.org",
  "michelle@nationalfundforwomen.org",
  "kelsey@nationalfundforwomen.org",
  "ron@myherodesign.com",
];

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, isReviewer } = body;

    if (!memberId || typeof isReviewer !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Service role: updating ANOTHER user's row. The RLS UPDATE policy is own-row only,
    // so the cookie client silently matched 0 rows here (bug fixed 2026-09-11).
    const { error: updateError } = await getAdminClient()
      .from("profiles")
      .update({ is_reviewer: isReviewer })
      .eq("id", memberId);

    if (updateError) {
      console.error("[set-reviewer] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_reviewer: isReviewer });
  } catch (err: any) {
    console.error("[set-reviewer] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const emailsParam = searchParams.get("emails");

    if (!emailsParam) {
      return NextResponse.json({ statuses: [] });
    }

    const emails = emailsParam.split(",").filter((e) => e.includes("@"));

    if (emails.length === 0) {
      return NextResponse.json({ statuses: [] });
    }

    // Fetch approval statuses for these emails
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("email, is_approved_free_member")
      .in("email", emails);

    if (error) {
      console.error("[approval-statuses] Error fetching profiles:", error);
      return NextResponse.json({ error: "Failed to fetch statuses" }, { status: 500 });
    }

    // Build statuses array with [email, isApproved] pairs for Map construction
    const statuses: [string, boolean][] = (profiles || []).map((p) => [
      p.email,
      p.is_approved_free_member === true,
    ]);

    return NextResponse.json({ statuses });
  } catch (err) {
    console.error("[approval-statuses] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const userIdsParam = searchParams.get("user_ids");

    if (!userIdsParam) {
      return NextResponse.json({ statuses: [] });
    }

    const userIds = userIdsParam.split(",").filter((id) => id.length > 0);

    if (userIds.length === 0) {
      return NextResponse.json({ statuses: [] });
    }

    // Fetch approval statuses for these user_ids
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, is_approved_free_member")
      .in("id", userIds);

    if (error) {
      console.error("[approval-statuses] Error fetching profiles:", error);
      return NextResponse.json({ error: "Failed to fetch statuses" }, { status: 500 });
    }

    // Build statuses array with [user_id, isApproved] pairs for Map construction
    const statuses: [string, boolean][] = (profiles || []).map((p) => [
      p.id,
      p.is_approved_free_member === true,
    ]);

    return NextResponse.json({ statuses });
  } catch (err) {
    console.error("[approval-statuses] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

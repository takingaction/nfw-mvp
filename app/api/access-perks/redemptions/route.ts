import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const excludeArchived = searchParams.get("exclude_archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

// Build query
    let query = supabase
      .from("offer_redemptions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("redeemed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    } else if (excludeArchived) {
      query = query.neq("status", "archived");
    }

    const { data: redemptions, error, count } = await query;

    console.log("Redemptions for user", user.id, ":", redemptions?.map(r => ({ id: r.id, status: r.status, offer_title: r.offer_title })));

    if (error) {
      console.error("Failed to fetch redemptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch redemptions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      redemptions: redemptions || [],
      total_count: count || 0,
    });
  } catch (error: any) {
    console.error("Redemptions API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabase = await createClient();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { data: claims } = await supabase
      .from("zero_dollar_claims")
      .select("id")
      .eq("user_id", userId)
      .gte("claimed_at", startOfMonth)
      .lte("claimed_at", endOfMonth)
      .in("status", ["fulfilled", "paid"]);

    return NextResponse.json({
      claimedThisMonth: (claims?.length || 0) > 0,
      claimCount: claims?.length || 0,
    });
  } catch (error) {
    console.error("Error checking claims:", error);
    return NextResponse.json({ claimedThisMonth: false, claimCount: 0 }, { status: 500 });
  }
}

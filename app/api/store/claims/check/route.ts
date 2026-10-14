import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Has the logged-in member completed a Zero Dollar Store claim this month?
 * Identity comes from the session (cookie or Bearer). A `?userId=` query
 * param is still accepted from older clients but ignored.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ claimedThisMonth: false, claimCount: 0 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    // Exclusive upper bound so claims made late on the last day still count.
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { data: claims } = await supabase
      .from("zero_dollar_claims")
      .select("id")
      .eq("user_id", user.id)
      .gte("claimed_at", startOfMonth)
      .lt("claimed_at", startOfNextMonth)
      .in("status", ["completed", "fulfilled", "paid"]);

    return NextResponse.json({
      claimedThisMonth: (claims?.length || 0) > 0,
      claimCount: claims?.length || 0,
    });
  } catch (error) {
    console.error("Error checking claims:", error);
    return NextResponse.json({ claimedThisMonth: false, claimCount: 0 }, { status: 500 });
  }
}

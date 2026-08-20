import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const offerKey = searchParams.get("offer_key");

    if (!offerKey) {
      return NextResponse.json({ error: "offer_key is required" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: redemption, error } = await supabase
      .from("offer_redemptions")
      .select("coupon_code, status")
      .eq("user_id", user.id)
      .eq("offer_key", offerKey)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Failed to check redemption:", error);
      return NextResponse.json({ error: "Failed to check redemption" }, { status: 500 });
    }

    return NextResponse.json({
      redeemed: !!redemption,
      coupon_code: redemption?.coupon_code || null,
    });
  } catch (error: any) {
    console.error("Check redemption API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

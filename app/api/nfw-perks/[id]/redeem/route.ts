import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const { data: user, error: userError } = await supabase.auth.getUser();

    if (userError || !user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.user.id;

    const { data: perk, error: perkError } = await supabase
      .from("nfw_perks")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (perkError) {
      console.error("Error fetching perk:", perkError);
      return NextResponse.json({ error: perkError.message }, { status: 500 });
    }

    if (!perk) {
      return NextResponse.json({ error: "Perk not found" }, { status: 404 });
    }

    if (perk.expires_at && new Date(perk.expires_at) < new Date()) {
      return NextResponse.json({ error: "This perk has expired" }, { status: 400 });
    }

    if (!perk.landing_page_url) {
      return NextResponse.json({ error: "Landing page URL not configured" }, { status: 400 });
    }

    const { data: existingRedemption } = await supabase
      .from("nfw_perk_redemptions")
      .select("id")
      .eq("perk_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRedemption) {
      return NextResponse.json({ error: "You have already redeemed this perk" }, { status: 400 });
    }

    const { count: redemptionCount } = await supabase
      .from("nfw_perk_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("perk_id", id);

    if (redemptionCount !== null && perk.max_redemptions_total && redemptionCount >= perk.max_redemptions_total) {
      return NextResponse.json({ error: "This perk has reached its maximum number of redemptions" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("nfw_perk_redemptions")
      .insert({
        perk_id: id,
        user_id: userId,
      });

    if (insertError) {
      console.error("Error recording redemption:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      landingPageUrl: perk.landing_page_url,
      discountDescription: perk.discount_value || perk.description,
      partnerName: perk.partner_name,
      couponCode: perk.coupon_code || null,
    });
  } catch (error) {
    console.error("Error in POST /api/nfw-perks/[id]/redeem:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

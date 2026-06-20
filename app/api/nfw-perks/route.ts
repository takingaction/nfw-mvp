import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const categories = searchParams.get("categories");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = await createClient();

    // Get user from session if userId not provided
    let userId = userIdParam;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    let query = supabase
      .from("nfw_perks")
      .select("*")
      .eq("is_active", true)
      .order("featured_order", { nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (categories) {
      const categoryList = categories.split(",");
      query = query.overlaps("categories", categoryList);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,partner_name.ilike.%${search}%`);
    }

    const { data: perks, error } = await query;

    if (error) {
      console.error("Error fetching NFW perks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let perksWithRedemptionStatus = perks || [];

    if (userId) {
      const { data: redemptions } = await supabase
        .from("nfw_perk_redemptions")
        .select("perk_id")
        .eq("user_id", userId);

      const redeemedPerkIds = new Set(redemptions?.map((r) => r.perk_id) || []);

      perksWithRedemptionStatus = perksWithRedemptionStatus.map((perk) => ({
        ...perk,
        userHasRedeemed: redeemedPerkIds.has(perk.id),
      }));
    }

    const { count } = await supabase
      .from("nfw_perks")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    return NextResponse.json({
      perks: perksWithRedemptionStatus,
      total: count || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/nfw-perks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

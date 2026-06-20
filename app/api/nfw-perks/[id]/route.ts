import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const supabase = await createClient();

    const { data: perk, error } = await supabase
      .from("nfw_perks")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching NFW perk:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!perk) {
      return NextResponse.json({ error: "Perk not found" }, { status: 404 });
    }

    let result = perk;

    if (userId) {
      const { data: redemption } = await supabase
        .from("nfw_perk_redemptions")
        .select("*")
        .eq("perk_id", id)
        .eq("user_id", userId)
        .maybeSingle();

      result = {
        ...perk,
        userHasRedeemed: !!redemption,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/nfw-perks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

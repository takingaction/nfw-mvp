import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ [key: string]: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const supabase = await createClient();

    // Check if user is admin
    let isAdmin = false;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();
      isAdmin = profile?.is_admin === true;
    }

    // Non-admins cannot see admin-only perks
    let query = supabase
      .from("nfw_perks")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true);

    if (!isAdmin) {
      query = query.eq("is_admin_only", false);
    }

    const { data: perk, error } = await query.maybeSingle();

    if (error) {
      console.error("Error fetching NFW perk by slug:", error);
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
        .eq("perk_id", perk.id)
        .eq("user_id", userId)
        .maybeSingle();

      result = {
        ...perk,
        userHasRedeemed: !!redemption,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/nfw-perks/[slug]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

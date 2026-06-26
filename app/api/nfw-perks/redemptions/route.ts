import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: redemptions, error } = await supabase
      .from("nfw_perk_redemptions")
      .select(`
        id,
        perk_id,
        redeemed_at,
        nfw_perks (
          id,
          title,
          slug,
          partner_name,
          partner_logo_url,
          landing_page_url
        )
      `)
      .eq("user_id", user.id)
      .order("redeemed_at", { ascending: false });

    if (error) {
      console.error("Error fetching NFW perk redemptions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedRedemptions = (redemptions || []).map((r: any) => ({
      id: r.id,
      perk_id: r.perk_id,
      redeemed_at: r.redeemed_at,
      title: r.nfw_perks?.title || "NFW Perk",
      slug: r.nfw_perks?.slug || null,
      partner_name: r.nfw_perks?.partner_name || null,
      logo_url: r.nfw_perks?.partner_logo_url || null,
      landing_page_url: r.nfw_perks?.landing_page_url || null,
    }));

    return NextResponse.json({ redemptions: formattedRedemptions });
  } catch (error) {
    console.error("Error in GET /api/nfw-perks/redemptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

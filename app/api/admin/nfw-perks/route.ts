import { NextResponse } from "next/server";
import { createClient as createClientSupabase } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClientSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    await requireAdmin();

    const { data: perks, error } = await supabaseAdmin
      .from("nfw_perks")
      .select("*")
      .order("featured_order", { nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching NFW perks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const perksWithStats = await Promise.all(
      (perks || []).map(async (perk) => {
        const { count: redemptionCount } = await supabaseAdmin
          .from("nfw_perk_redemptions")
          .select("*", { count: "exact", head: true })
          .eq("perk_id", perk.id);

        return {
          ...perk,
          redemptionCount: redemptionCount || 0,
        };
      })
    );

    return NextResponse.json({ perks: perksWithStats });
  } catch (error) {
    console.error("Error in GET /api/admin/nfw-perks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();

    const {
      title,
      description,
      partner_name,
      partner_logo_url,
      landing_page_url,
      estimated_value,
      terms_and_conditions,
      max_redemptions_total,
      expires_at,
      is_active,
      categories,
      slug,
      coupon_code,
      is_admin_only,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!landing_page_url) {
      return NextResponse.json({ error: "Landing page URL is required" }, { status: 400 });
    }

    // Generate slug from title if not provided
    const generatedSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: perk, error } = await supabaseAdmin
      .from("nfw_perks")
      .insert({
        title,
        description,
        partner_name,
        partner_logo_url,
        landing_page_url,
        estimated_value,
        terms_and_conditions,
        max_redemptions_total: max_redemptions_total || 0,
        expires_at,
        is_active: is_active !== false,
        categories: categories || [],
        discount_type: "landing_page",
        slug: generatedSlug,
        coupon_code: coupon_code || null,
        is_admin_only: is_admin_only === true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating NFW perk:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(perk, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/nfw-perks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

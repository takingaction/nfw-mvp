import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminCheck";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const supabase = await createClient();

    const { data: perk, error } = await supabase
      .from("nfw_perks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching NFW perk:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!perk) {
      return NextResponse.json({ error: "Perk not found" }, { status: 404 });
    }

    const { count: redemptionCount } = await supabase
      .from("nfw_perk_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("perk_id", id);

    return NextResponse.json({ ...perk, redemptionCount: redemptionCount || 0 });
  } catch (error) {
    console.error("Error in GET /api/admin/nfw-perks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      description,
      partner_name,
      partner_logo_url,
      landing_page_url,
      estimated_value,
      terms_and_conditions,
      per_user_limit,
      expires_at,
      is_active,
      categories,
      slug,
    } = body;

    if (!landing_page_url) {
      return NextResponse.json({ error: "Landing page URL is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Generate slug from title if not provided
    const generatedSlug = slug || (title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      : null);

    const { data: perk, error } = await supabase
      .from("nfw_perks")
      .update({
        title,
        description,
        partner_name,
        partner_logo_url,
        landing_page_url,
        estimated_value,
        terms_and_conditions,
        per_user_limit,
        expires_at,
        is_active,
        categories,
        slug: generatedSlug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating NFW perk:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!perk) {
      return NextResponse.json({ error: "Perk not found" }, { status: 404 });
    }

    return NextResponse.json(perk);
  } catch (error) {
    console.error("Error in PUT /api/admin/nfw-perks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const supabase = await createClient();

    const { error } = await supabase
      .from("nfw_perks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting NFW perk:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/nfw-perks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

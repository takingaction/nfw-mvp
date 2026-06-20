import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const [
      micrograntsResult,
      perksResult,
      claimsResult,
      nfwPerksResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("grants")
        .select("payout_amount")
        .eq("user_id", userId)
        .eq("status", "paid"),
      supabaseAdmin
        .from("offer_redemptions")
        .select("offer_value")
        .eq("user_id", userId),
      supabaseAdmin
        .from("zero_dollar_claims")
        .select("shopify_product_id, shopify_variant_id")
        .eq("user_id", userId)
        .in("status", ["fulfilled", "paid", "delivered"]),
      supabaseAdmin
        .from("nfw_perk_redemptions")
        .select("perk_id")
        .eq("user_id", userId),
    ]);

    const micrograntsTotal = (micrograntsResult.data || [])
      .reduce((sum: number, g: { payout_amount: number | null }) => sum + (g.payout_amount || 0), 0);

    const perksTotal = (perksResult.data || [])
      .reduce((sum: number, r: { offer_value: string | number | null }) => sum + (Number(r.offer_value) || 0), 0);

    let claimsTotal = 0;
    const claims = claimsResult.data || [];
    if (claims.length > 0) {
      const variantIds = claims.map((c: { shopify_variant_id: string }) => c.shopify_variant_id);
      const { data: products } = await supabaseAdmin
        .from("shopify_product_mappings")
        .select("shopify_variant_id, compare_at_price")
        .in("shopify_variant_id", variantIds);

      const priceMap = new Map<string, number>();
      (products || []).forEach((p: { shopify_variant_id: string; compare_at_price: number | null }) => {
        priceMap.set(p.shopify_variant_id, p.compare_at_price || 0);
      });

      claimsTotal = claims.reduce((sum: number, c: { shopify_variant_id: string }) => {
        return sum + (priceMap.get(c.shopify_variant_id) || 0);
      }, 0);
    }

    let nfwPerksTotal = 0;
    const nfwPerkRedemptions = nfwPerksResult.data || [];
    if (nfwPerkRedemptions.length > 0) {
      const perkIds = nfwPerkRedemptions.map((r: { perk_id: string }) => r.perk_id);
      const { data: perks } = await supabaseAdmin
        .from("nfw_perks")
        .select("id, estimated_value")
        .in("id", perkIds);

      const perkValueMap = new Map<string, number>();
      (perks || []).forEach((p: { id: string; estimated_value: number | null }) => {
        perkValueMap.set(p.id, p.estimated_value || 0);
      });

      nfwPerksTotal = nfwPerkRedemptions.reduce((sum: number, r: { perk_id: string }) => {
        return sum + (perkValueMap.get(r.perk_id) || 0);
      }, 0);
    }

    const total = micrograntsTotal + perksTotal + claimsTotal + nfwPerksTotal;

    return NextResponse.json({
      total,
      microgrants: micrograntsTotal,
      perks: perksTotal,
      zeroDollarStore: claimsTotal,
      nfwPerks: nfwPerksTotal,
    });
  } catch (error) {
    console.error("Error calculating savings:", error);
    return NextResponse.json(
      { error: "Failed to calculate savings" },
      { status: 500 }
    );
  }
}

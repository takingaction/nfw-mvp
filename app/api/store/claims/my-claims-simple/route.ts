import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json([]);
    }

    const { data: claims } = await supabase
      .from("zero_dollar_claims")
      .select("*")
      .eq("user_id", user.id)
      .order("claimed_at", { ascending: false })
      .limit(5);

    if (!claims || claims.length === 0) {
      return NextResponse.json([]);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nationalfundforwomen.org";

    // Fetch product details
    try {
      const productsRes = await fetch(
        `${siteUrl}/api/shopify/products`,
        { cache: 'no-store' }
      );
      
      if (productsRes.ok) {
        const products = await productsRes.json();
        const productMap = new Map(
          products.map((p: { shopifyProductId: string; title: string; imageUrl: string }) => [
            p.shopifyProductId,
            { title: p.title, imageUrl: p.imageUrl }
          ])
        );

        const enrichedClaims = claims.map(claim => ({
          ...claim,
          product: productMap.get(claim.shopify_product_id) || null,
        }));

        return NextResponse.json(enrichedClaims);
      }
    } catch {
      // Fallback to claims without product details
    }

    return NextResponse.json(claims);
  } catch (error) {
    console.error("Error fetching claims:", error);
    return NextResponse.json([]);
  }
}

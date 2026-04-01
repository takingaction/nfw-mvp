import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct, getShopifyAccessToken } from "@/lib/shopify";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { MOCK_PRODUCTS, transformShopifyProduct, MockProduct } from "@/lib/mock-shopify";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get("featured") === "true";
    const adminView = searchParams.get("admin_view") === "true";
    const checkConnection = searchParams.get("check_connection") === "true";

    if (checkConnection) {
      const token = await getShopifyAccessToken();
      return NextResponse.json({ connected: !!token }, { status: 200 });
    }

    let products: MockProduct[] = MOCK_PRODUCTS;
    let useRealShopify = false;

    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    useRealShopify = !!(shopDomain && clientId && 
                           clientId !== "your-shopify-client-id" &&
                           !shopDomain.includes("placeholder"));

    if (useRealShopify) {
      try {
        const data = await shopifyFetch<{ products: { edges: Array<{ node: ShopifyProduct }> } }>({
          query: PRODUCTS_QUERY,
          variables: { first: 50 },
        });

        const { data: mappings } = await supabaseAdmin.rpc('get_all_shopify_mappings') as { data: Array<{
        id: string;
        shopify_product_id: string;
        shopify_variant_id: string;
        mvp_visibility: boolean;
        eligibility_tiers: string[];
        display_order: number;
        featured_order: number;
      }> | null };

        const mappingMap = new Map((mappings || []).map(m => [m.shopify_product_id, m]));

        products = data.products.edges.map(({ node }) => {
          const rawMapping = mappingMap.get(node.id);
          const mapping = rawMapping ? {
            shopifyProductId: rawMapping.shopify_product_id,
            shopifyVariantId: rawMapping.shopify_variant_id,
            title: "",
            description: "",
            imageUrl: "",
            availableForSale: true,
            variants: [],
            mvpVisibility: rawMapping.mvp_visibility,
            eligibilityTiers: rawMapping.eligibility_tiers,
            displayOrder: rawMapping.display_order,
            featuredOrder: rawMapping.featured_order,
          } : undefined;
          return transformShopifyProduct(node, mapping);
        });
      } catch {
        products = MOCK_PRODUCTS;
      }
    }

    if (!adminView) {
      products = products.filter(p => p.mvpVisibility);
    }

    const sortedProducts = products.sort((a, b) => a.displayOrder - b.displayOrder);

    if (featured) {
      const featuredProducts = sortedProducts
        .filter(p => p.mvpVisibility && p.featuredOrder < 999)
        .sort((a, b) => a.featuredOrder - b.featuredOrder)
        .slice(0, 3);
      return NextResponse.json(featuredProducts);
    }

    return NextResponse.json(sortedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct, getShopifyAccessToken } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/server";
import { MOCK_PRODUCTS, transformShopifyProduct, MockProduct } from "@/lib/mock-shopify";

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

        const supabase = await createClient();
        const { data: mappings } = await supabase
          .from("shopify_product_mappings")
          .select("*");

        const mappingMap = new Map((mappings || []).map(m => [m.shopify_product_id, m]));

        products = data.products.edges.map(({ node }) => {
          const mapping = mappingMap.get(node.id);
          return transformShopifyProduct(node, mapping as MockProduct | undefined);
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
      return NextResponse.json(sortedProducts.filter(p => p.mvpVisibility && p.displayOrder < 999).slice(0, 3));
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

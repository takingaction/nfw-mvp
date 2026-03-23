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
    console.log("DEBUG useRealShopify:", useRealShopify, "shopDomain:", shopDomain, "clientId:", clientId ? "set" : "NOT SET");

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
        console.log("DEBUG mappings count:", mappings?.length);
        console.log("DEBUG mappings sample:", mappings?.slice(0, 2).map(m => ({ id: m.shopify_product_id, display_order: m.display_order, mvp_visibility: m.mvp_visibility })));

        const mappingMap = new Map((mappings || []).map(m => [m.shopify_product_id, m]));
        console.log("DEBUG mappingMap keys:", Array.from(mappingMap.keys()));
        console.log("DEBUG node.id sample:", data.products.edges[0]?.node.id);

        products = data.products.edges.map(({ node }) => {
          const mapping = mappingMap.get(node.id);
          console.log("DEBUG lookup:", node.id, mapping ? "FOUND" : "NOT FOUND", mapping?.display_order);
          return transformShopifyProduct(node, mapping as MockProduct | undefined);
        });
        console.log("DEBUG products with mapping:", products.slice(0, 2).map(p => ({ title: p.title, displayOrder: p.displayOrder, mvpVisibility: p.mvpVisibility })));
      } catch {
        products = MOCK_PRODUCTS;
      }
    }

    if (!adminView) {
      products = products.filter(p => p.mvpVisibility);
    }

    const sortedProducts = products.sort((a, b) => a.displayOrder - b.displayOrder);

    if (featured) {
      const featuredProducts = sortedProducts.filter(p => p.mvpVisibility && p.displayOrder < 999).slice(0, 3);
      console.log("DEBUG featured:", featuredProducts.map(p => ({ title: p.title, displayOrder: p.displayOrder, mvpVisibility: p.mvpVisibility })));
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

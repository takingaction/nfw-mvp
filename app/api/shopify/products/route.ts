import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/server";
import { MOCK_PRODUCTS, transformShopifyProduct, MockProduct } from "@/lib/mock-shopify";

const USE_MOCK = !process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_CLIENT_ID === "your-shopify-client-id";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get("featured") === "true";

    let products: MockProduct[] = [];

    if (USE_MOCK) {
      console.log("Using mock product data");
      products = MOCK_PRODUCTS.filter(p => p.mvpVisibility);
    } else {
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
      }).filter(p => p.mvpVisibility);
    }

    const sortedProducts = products.sort((a, b) => a.displayOrder - b.displayOrder);

    if (featured) {
      return NextResponse.json(sortedProducts.slice(0, 3));
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

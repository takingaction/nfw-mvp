import { NextResponse } from "next/server";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/server";

const USE_MOCK = !process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_CLIENT_ID === "your-shopify-client-id";

export async function POST() {
  try {
    const supabase = await createClient();

    if (USE_MOCK) {
      return NextResponse.json({ count: 0, message: "Mock mode - no sync needed" });
    }

    const data = await shopifyFetch<{ products: { edges: Array<{ node: ShopifyProduct }> } }>({
      query: PRODUCTS_QUERY,
      variables: { first: 250 },
    });

    let syncedCount = 0;

    for (const { node } of data.products.edges) {
      const firstVariant = node.variants.edges[0]?.node;

      const { error } = await supabase
        .from("shopify_product_mappings")
        .upsert(
          {
            shopify_product_id: node.id,
            shopify_variant_id: firstVariant?.id || "",
            eligibility_tiers: ["free", "contributing", "founding"],
            display_order: syncedCount + 1,
          },
          {
            onConflict: "shopify_product_id",
          },
        );

      if (!error) {
        syncedCount++;
      }
    }

    return NextResponse.json({ count: syncedCount });
  } catch (error) {
    console.error("Error syncing from Shopify:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

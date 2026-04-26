import { NextResponse } from "next/server";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    await requireAdmin();
    const data = await shopifyFetch<{ products: { edges: Array<{ node: ShopifyProduct }> } }>({
      query: PRODUCTS_QUERY,
      variables: { first: 250 },
    });

    let syncedCount = 0;

    for (const { node } of data.products.edges) {
      const firstVariant = node.variants.edges[0]?.node;

      const { error } = await supabaseAdmin
        .from("shopify_product_mappings")
        .upsert(
          {
            shopify_product_id: node.id,
            shopify_variant_id: firstVariant?.id || "",
            eligibility_tiers: ["free", "contributing", "founding"],
            display_order: syncedCount + 1,
            mvp_visibility: false,
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
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

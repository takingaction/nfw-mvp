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
    const shopifyProductIds: string[] = [];

    for (const { node } of data.products.edges) {
      const firstVariant = node.variants.edges[0]?.node;
      shopifyProductIds.push(node.id);

      // Check if product already exists to preserve visibility/starred status
      const { data: existing } = await supabaseAdmin
        .from("shopify_product_mappings")
        .select("mvp_visibility")
        .eq("shopify_product_id", node.id)
        .maybeSingle();

      // Only set mvp_visibility: false for NEW products; preserve existing visibility
      const { error } = await supabaseAdmin
        .from("shopify_product_mappings")
        .upsert(
          {
            shopify_product_id: node.id,
            shopify_variant_id: firstVariant?.id || "",
            eligibility_tiers: ["free", "contributing", "founding"],
            display_order: syncedCount + 1,
            // Only set visibility for new products; preserve existing for updates
            ...(existing ? {} : { mvp_visibility: false }),
          },
          {
            onConflict: "shopify_product_id",
          },
        );

      if (!error) {
        syncedCount++;
      }
    }

    // Delete products that no longer exist in Shopify
    if (shopifyProductIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("shopify_product_mappings")
        .delete()
        .not("shopify_product_id", "in", shopifyProductIds);

      if (deleteError) {
        console.error("Error deleting removed products:", deleteError);
      }
    }

    return NextResponse.json({ count: syncedCount });
  } catch (error) {
    console.error("Error syncing from Shopify:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
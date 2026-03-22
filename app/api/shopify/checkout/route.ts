import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { variantId, productId, userId } = await request.json();

    if (!variantId || !productId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || "nfw-checkout.myshopify.com";

    const variantIdMatch = variantId.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/);
    if (!variantIdMatch) {
      return NextResponse.json(
        { error: "Invalid variant ID format" },
        { status: 400 }
      );
    }
    const numericVariantId = variantIdMatch[1];

    const checkoutUrl = `https://${shopDomain}/cart/${numericVariantId}:1`;

    const { error: claimError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: userId,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: `checkout_${Date.now()}`,
        status: "created",
        shipping_address: { placeholder: true },
        claimed_at: new Date().toISOString(),
      });

    if (claimError) {
      console.error("Error creating claim:", claimError);
      return NextResponse.json(
        { error: `Failed to save claim: ${claimError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl,
      checkoutId: `checkout_${Date.now()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout:", message);
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 }
    );
  }
}

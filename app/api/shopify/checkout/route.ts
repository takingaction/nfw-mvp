import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, CHECKOUT_CREATE_MUTATION, CHECKOUT_SHIPPING_ADDRESS_UPDATE_MUTATION, getShopifyAccessToken } from "@/lib/shopify";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { variantId, productId, userId, shippingAddress } = await request.json();

    if (!variantId || !productId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if we have a Shopify token
    const token = await getShopifyAccessToken();
    if (!token) {
      return NextResponse.json(
        { error: "Shopify not connected. Please connect to Shopify first." },
        { status: 400 }
      );
    }

    const checkoutInput = {
      lineItems: [
        {
          variantId,
          quantity: 1,
        },
      ],
    };

    const checkoutData = await shopifyFetch<{
      checkoutCreate: {
        checkout: { id: string; webUrl: string };
        checkoutUserErrors: Array<{ code: string; field: string[]; message: string }>;
      };
    }>({
      query: CHECKOUT_CREATE_MUTATION,
      variables: { input: checkoutInput },
    });

    if (checkoutData.checkoutCreate.checkoutUserErrors.length > 0) {
      const error = checkoutData.checkoutCreate.checkoutUserErrors[0];
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const { id: checkoutId, webUrl: checkoutUrl } = checkoutData.checkoutCreate.checkout;

    if (shippingAddress) {
      const addressInput = {
        address1: shippingAddress.address_line1,
        address2: shippingAddress.address_line2 || "",
        city: shippingAddress.city,
        country: shippingAddress.country || "US",
        firstName: shippingAddress.full_name.split(" ")[0] || "",
        lastName: shippingAddress.full_name.split(" ").slice(1).join(" ") || "",
        phone: shippingAddress.phone || "",
        province: shippingAddress.state,
        zip: shippingAddress.zip,
      };

      await shopifyFetch<{
        checkoutShippingAddressUpdateV2: {
          checkout: { id: string; webUrl: string };
          checkoutUserErrors: Array<{ code: string; field: string[]; message: string }>;
        };
      }>({
        query: CHECKOUT_SHIPPING_ADDRESS_UPDATE_MUTATION,
        variables: { checkoutId, shippingAddress: addressInput },
      });
    }

    const { error: claimError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: userId,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: checkoutId,
        status: "created",
        shipping_address: shippingAddress || null,
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
      checkoutId,
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

import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch, CHECKOUT_QUERY, getShopifyAccessToken } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: claim } = await supabase
      .from("zero_dollar_claims")
      .select("*")
      .eq("shopify_checkout_id", id)
      .single();

    if (!claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    if (!claim.shopify_checkout_id) {
      return NextResponse.json({
        checkoutId: id,
        status: claim.status,
        trackingNumber: claim.tracking_number,
        trackingUrl: claim.tracking_url,
        orderId: claim.shopify_order_id,
        completedAt: null,
      });
    }

    // Check if we have a Shopify token
    const token = await getShopifyAccessToken();
    if (!token) {
      // Return cached data if no token available
      return NextResponse.json({
        checkoutId: id,
        status: claim.status,
        trackingNumber: claim.tracking_number,
        trackingUrl: claim.tracking_url,
        orderId: claim.shopify_order_id,
        completedAt: claim.status === "fulfilled" ? new Date().toISOString() : null,
      });
    }

    const data = await shopifyFetch<{
      node: {
        id: string;
        webUrl: string;
        completedAt: string | null;
        order: {
          id: string;
          name: string;
          fulfillments: {
            edges: Array<{
              node: {
                trackingInfo: Array<{
                  number: string;
                  url: string;
                }>;
              };
            }>;
          } | null;
        } | null;
      } | null;
    }>({
      query: CHECKOUT_QUERY,
      variables: { id: claim.shopify_checkout_id },
    });

    if (!data.node) {
      return NextResponse.json(
        { error: "Checkout not found" },
        { status: 404 }
      );
    }

    const checkout = data.node;
    let status = claim.status;
    let trackingNumber = claim.tracking_number;
    let trackingUrl = claim.tracking_url;
    let orderId = claim.shopify_order_id;

    if (checkout.completedAt && checkout.order) {
      status = "fulfilled";
      orderId = checkout.order.id;

      if (checkout.order.fulfillments?.edges && checkout.order.fulfillments.edges.length > 0) {
        const fulfillment = checkout.order.fulfillments.edges[0].node;
        if (fulfillment.trackingInfo && fulfillment.trackingInfo.length > 0) {
          trackingNumber = fulfillment.trackingInfo[0].number;
          trackingUrl = fulfillment.trackingInfo[0].url;
        }
      }

      await supabase
        .from("zero_dollar_claims")
        .update({
          status,
          shopify_order_id: orderId,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
        })
        .eq("id", claim.id);
    }

    return NextResponse.json({
      checkoutId: id,
      status,
      trackingNumber,
      trackingUrl,
      orderId,
      completedAt: checkout.completedAt,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

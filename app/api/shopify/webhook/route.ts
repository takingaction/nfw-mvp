import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyShopifyWebhook(body: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing SHOPIFY_WEBHOOK_SECRET");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(body).digest("base64");
  
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}

export async function POST(request: Request) {
  try {
    // Log to database at the very start to verify if requests are reaching us
    const timestamp = new Date().toISOString();
    try {
      await supabaseAdmin
        .from("zero_dollar_claims")
        .insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          shopify_product_id: `webhook_log_${timestamp.replace(/[:.]/g, '-')}`,
          shopify_variant_id: "webhook_variant",
          status: "pending",
          shipping_address: { webhook_test: true, timestamp },
        });
      console.log("Database log inserted for webhook at", timestamp);
    } catch (dbError) {
      console.error("Failed to insert database log:", dbError);
    }

    console.log("Webhook POST called at", timestamp);
    const body = await request.text();
    console.log("Webhook body:", body.substring(0, 200));
    const signature = request.headers.get("X-Shopify-Hmac-Sha256");
    const topic = request.headers.get("X-Shopify-Topic");

    console.log("Webhook received:", { topic, bodyLength: body.length, hasSignature: !!signature });

    // BYPASS SIGNATURE VERIFICATION FOR TESTING
    // TODO: Re-enable before production
    console.log("WARNING: Signature verification bypassed for testing");

    // Temporarily skip signature verification
    // if (!verifyShopifyWebhook(body, signature)) {
    //   console.error("Invalid Shopify webhook signature");
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const event = JSON.parse(body);
    console.log("Webhook event:", JSON.stringify(event).substring(0, 500));

    if (topic === "orders/create") {
      const order = event;
      console.log("Order ID:", order.id, "Variant ID:", order.line_items?.[0]?.variant_id);
      const orderId = `gid://shopify/Order/${order.id}`;
      const checkoutId = order.checkout_id ? `gid://shopify/Checkout/${order.checkout_id}` : null;
      const lineItems = order.line_items || [];
      
      if (lineItems.length === 0) {
        return NextResponse.json({ received: true });
      }

      const variantId = lineItems[0].variant_id
        ? `gid://shopify/ProductVariant/${lineItems[0].variant_id}`
        : null;

      const fulfillment = order.fulfillments?.[0];
      const trackingNumber = fulfillment?.tracking_number || null;
      const trackingUrl = fulfillment?.tracking_url || null;

      if (variantId) {
        console.log("Looking for claim with variantId:", variantId);
        const { data: existingClaims } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_variant_id", variantId)
          .eq("status", "created")
          .order("claimed_at", { ascending: true })
          .limit(1);

        console.log("Found claims:", existingClaims?.length);
        if (existingClaims && existingClaims.length > 0) {
          const claim = existingClaims[0];
          console.log("Updating claim:", claim.id);
          
          const { error: updateError } = await supabaseAdmin
            .from("zero_dollar_claims")
            .update({
              status: "fulfilled",
              shopify_order_id: orderId,
              shopify_checkout_id: checkoutId || orderId,
              tracking_number: trackingNumber,
              tracking_url: trackingUrl,
            })
            .eq("id", claim.id);

          if (updateError) {
            console.error("Failed to update claim:", updateError);
          } else {
            console.log("Updated claim", claim.id, "with order", orderId);
          }
        } else {
          console.log("No matching claim found for variant", variantId);
        }
      } else {
        console.log("No variant ID in order:", order);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Shopify webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

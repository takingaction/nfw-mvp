import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyShopifyWebhook(body: string, signature: string | null): boolean {
  if (!signature) {
    console.error("No signature provided");
    return false;
  }
  
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing SHOPIFY_WEBHOOK_SECRET");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(body).digest("base64");
  
  const signatureBuffer = Buffer.from(signature, 'base64');
  const digestBuffer = Buffer.from(digest, 'base64');
  
  console.log("HMAC debug:", {
    bodyLength: body.length,
    secretLength: secret.length,
    secretFirstChars: secret.substring(0, 10),
    signatureLength: signature.length,
    digestLength: digest.length,
    signatureBufferLength: signatureBuffer.length,
    digestBufferLength: digestBuffer.length
  });
  
  // Direct byte comparison for debugging
  if (signatureBuffer.length !== digestBuffer.length) {
    console.error("Length mismatch - signature:", signatureBuffer.length, "digest:", digestBuffer.length);
  }
  
  const match = crypto.timingSafeEqual(signatureBuffer, digestBuffer);
  console.log("Signature match result:", match);
  
  return match;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("X-Shopify-Hmac-Sha256");
    const topic = request.headers.get("X-Shopify-Topic");

    console.log("Webhook received:", { topic, bodyLength: body.length });

    if (!verifyShopifyWebhook(body, signature)) {
      console.error("Invalid Shopify webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (topic === "orders/create") {
      const order = event;
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
        const { data: existingClaims } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_variant_id", variantId)
          .eq("status", "created")
          .order("claimed_at", { ascending: true })
          .limit(1);

        if (existingClaims && existingClaims.length > 0) {
          const claim = existingClaims[0];
          
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

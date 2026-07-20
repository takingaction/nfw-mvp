import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifyShopifyWebhook(body: Buffer, signature: string | null): boolean {
  if (!signature) {
    console.error("No signature provided");
    return false;
  }
  
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    console.error("Missing SHOPIFY_CLIENT_SECRET");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(body).digest("base64");
  
  const signatureBuffer = Buffer.from(signature, 'base64');
  const digestBuffer = Buffer.from(digest, 'base64');
  
  return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
}

export async function GET() {
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const signature = request.headers.get("X-Shopify-Hmac-Sha256");
    const topic = request.headers.get("X-Shopify-Topic");

    if (!verifyShopifyWebhook(body, signature)) {
      console.error("Invalid Shopify webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body.toString());

    // Debug: Log when webhook is received
    console.log(`[webhook] Received ${topic} at ${new Date().toISOString()}`);

    if (topic === "orders/create") {
      const order = event;
      const orderId = `gid://shopify/Order/${order.id}`;
      const checkoutId = order.checkout_id ? `gid://shopify/Checkout/${order.checkout_id}` : null;
      const lineItems = order.line_items || [];
      
      console.log(`[orders/create] Order ID: ${orderId}, checkout_id: ${checkoutId}`);

      if (lineItems.length === 0) {
        console.log(`[orders/create] No line items, skipping`);
        return NextResponse.json({ received: true });
      }

      const variantId = lineItems[0].variant_id
        ? `gid://shopify/ProductVariant/${lineItems[0].variant_id}`
        : null;
      
      console.log(`[orders/create] Variant ID: ${variantId}`);

      const fulfillment = order.fulfillments?.[0];
      const trackingNumber = fulfillment?.tracking_number || null;
      const trackingUrl = fulfillment?.tracking_url || null;
      const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
      const claimMonth = new Date(orderCreatedAt.getFullYear(), orderCreatedAt.getMonth(), 1).toISOString().split('T')[0];

      if (variantId) {
        // Shopify uses different field names depending on how the order was created:
        // - Draft Orders: order.attributes (attr.name)
        // - Cart API / standard checkout: order.note_attributes (attr.key)
        const orderAttributes = [
          ...(order.attributes || []),
          ...(order.note_attributes || [])
        ];

        const nfwUserIdAttr = orderAttributes.find(
          (attr: { key?: string; name?: string; value: string }) =>
            attr.key === "nfw_user_id" || attr.name === "nfw_user_id"
        );
        const nfwCheckoutTimeAttr = orderAttributes.find(
          (attr: { key?: string; name?: string; value: string }) =>
            attr.key === "nfw_checkout_time" || attr.name === "nfw_checkout_time"
        );
        const nfwUserId = nfwUserIdAttr?.value || null;
        const nfwCheckoutTime = nfwCheckoutTimeAttr ? parseInt(nfwCheckoutTimeAttr.value, 10) : null;

        // Debug: Log all order attributes to see what Shopify is sending
        console.log(`[orders/create] Order ${orderId} attributes:`, JSON.stringify(orderAttributes));
        console.log(`[orders/create] nfw_user_id: ${nfwUserId}, nfw_checkout_time: ${nfwCheckoutTime}`);

        // First try to find claim by variant_id (correct primary path)
        let { data: existingClaims } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_variant_id", variantId)
          .eq("status", "created")
          .order("claimed_at", { ascending: true })
          .limit(1);

        // Track which path found the claim
        let foundViaVariantId = existingClaims && existingClaims.length > 0;
        let foundViaUserProduct = false;

        // Second fallback: try by user_id + product_id (handles case where wrong variant was recorded)
        if ((!existingClaims || existingClaims.length === 0) && nfwUserId) {
          const productId = `gid://shopify/Product/${lineItems[0].product_id}`;
          const { data: claimsByUser } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("*")
            .eq("user_id", nfwUserId)
            .eq("shopify_product_id", productId)
            .eq("status", "created")
            .order("claimed_at", { ascending: true })
            .limit(1);
          
          if (claimsByUser && claimsByUser.length > 0) {
            existingClaims = claimsByUser;
            foundViaUserProduct = true;
          }
        }

        // Third fallback: try by shopify_checkout_id (checkout ID stored when claim created)
        let foundViaCheckoutId = false;
        if ((!existingClaims || existingClaims.length === 0) && checkoutId) {
          // First try exact match (should rarely work since formats differ)
          const { data: claimsByCheckout } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("*")
            .eq("shopify_checkout_id", checkoutId)
            .eq("status", "created")
            .limit(1);
          
          if (claimsByCheckout && claimsByCheckout.length > 0) {
            existingClaims = claimsByCheckout;
            foundViaCheckoutId = true;
            console.log(`Found claim ${existingClaims[0].id} via checkout_id exact match`);
            
            // Update shopify_checkout_id to the real Shopify GID format
            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ shopify_checkout_id: checkoutId })
              .eq("id", existingClaims[0].id);
            console.log(`Updated shopify_checkout_id to ${checkoutId}`);
          }
        }

        // Fourth fallback: try by extracting numeric part from checkout ID
        // Shopify sends: gid://shopify/Checkout/1234567890
        // We store: checkout_1781130242614
        if ((!existingClaims || existingClaims.length === 0) && checkoutId) {
          const shopifyCheckoutNumeric = checkoutId.split('/').pop();
          if (shopifyCheckoutNumeric) {
            // Try to find claim where shopify_checkout_id ends with the numeric ID
            const { data: claimsByNumeric } = await supabaseAdmin
              .from("zero_dollar_claims")
              .select("*")
              .like("shopify_checkout_id", `%${shopifyCheckoutNumeric}`)
              .eq("status", "created")
              .limit(1);
            
            if (claimsByNumeric && claimsByNumeric.length > 0) {
              existingClaims = claimsByNumeric;
              foundViaCheckoutId = true;
              console.log(`Found claim ${existingClaims[0].id} via checkout_id numeric fallback (${shopifyCheckoutNumeric})`);
              
              // Update shopify_checkout_id to the real Shopify GID format
              await supabaseAdmin
                .from("zero_dollar_claims")
                .update({ shopify_checkout_id: checkoutId })
                .eq("id", existingClaims[0].id);
              console.log(`Updated shopify_checkout_id to ${checkoutId}`);
            }
          }
        }

        if (existingClaims && existingClaims.length > 0) {
          const claim = existingClaims[0];

          // Validate nfw_user_id matches the claim's user_id (prevents direct Shopify checkout fraud)
          // Skip validation if claim was found via variant_id (primary path), user_id+product_id fallback,
          // or checkout_id fallback. Draft Orders don't preserve note_attributes, so nfwUserId may be null.
          if (!foundViaCheckoutId && !foundViaVariantId && !foundViaUserProduct && (!nfwUserId || nfwUserId !== claim.user_id)) {
            console.log(`Rejecting order ${orderId} - invalid or missing nfw_user_id attribute. Expected: ${claim.user_id}, Got: ${nfwUserId}`);

            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ status: "rejected_invalid_user" })
              .eq("id", claim.id);

            return NextResponse.json({ received: true, reason: "Invalid user" });
          }

          // Only set status to fulfilled if there's tracking info (meaning actually shipped)
          // Otherwise keep as "completed" (checkout done, awaiting fulfillment)
          const newStatus = trackingNumber ? "fulfilled" : "completed";

          const { error: updateError } = await supabaseAdmin
            .from("zero_dollar_claims")
            .update({
              status: newStatus,
              shopify_order_id: orderId,
              shopify_checkout_id: checkoutId || orderId,
              tracking_number: trackingNumber,
              tracking_url: trackingUrl,
              order_status_url: order.order_status_url || null,
              claim_month: claimMonth,
            })
            .eq("id", claim.id);

          if (updateError) {
            console.error("Failed to update claim:", updateError);
          } else {
            console.log("Updated claim", claim.id, "with order", orderId, "status:", newStatus);
          }

          // Release pending checkout lock on completion
          // Query pending_monthly_claims to get the correct claim_month (stored as YYYY-MM-01)
          const { data: pendingClaim } = await supabaseAdmin
            .from("pending_monthly_claims")
            .select("claim_month")
            .eq("user_id", claim.user_id)
            .limit(1);

          if (pendingClaim && pendingClaim.length > 0) {
            const { error: deletePendingError } = await supabaseAdmin
              .from("pending_monthly_claims")
              .delete()
              .eq("user_id", claim.user_id)
              .eq("claim_month", pendingClaim[0].claim_month);

            if (deletePendingError) {
              console.error("Failed to delete pending claim:", deletePendingError);
            } else {
              console.log("Deleted pending claim for user", claim.user_id);
            }
          } else {
            console.log("No pending claim found for user", claim.user_id);
          }
        } else {
          console.log(`[orders/create] No matching claim found. Tried: variant=${variantId}, nfwUserId=${nfwUserId}, checkoutId=${checkoutId}`);
        }
      } else {
        console.log("[orders/create] No variant ID in order");
      }
    }

    if (topic === "orders/updated") {
      const order = event;
      const cancelReason = order.cancel_reason;

      // Only process if order was cancelled (any cancellation - including fulfilled orders)
      if (cancelReason) {
        // Shopify uses different field names depending on how the order was created:
        // - Draft Orders: order.attributes (attr.name)
        // - Cart API / standard checkout: order.note_attributes (attr.key)
        const orderAttributes = [
          ...(order.attributes || []),
          ...(order.note_attributes || [])
        ];

        const nfwUserIdAttr = orderAttributes.find(
          (attr: { key?: string; name?: string; value: string }) =>
            attr.key === "nfw_user_id" || attr.name === "nfw_user_id"
        );
        let nfwUserId = nfwUserIdAttr?.value || null;
        let claimMonth: string | null = null;

        // Fallback: if nfw_user_id not in attributes, look up by shopify_order_id
        if (!nfwUserId) {
          const orderId = `gid://shopify/Order/${order.id}`;
          console.log(`[orders/updated] nfw_user_id not in attributes, looking up by shopify_order_id: ${orderId}`);

          const { data: claimByOrderId } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("user_id, claim_month")
            .eq("shopify_order_id", orderId)
            .limit(1);

          if (claimByOrderId && claimByOrderId.length > 0) {
            nfwUserId = claimByOrderId[0].user_id;
            claimMonth = claimByOrderId[0].claim_month;
            console.log(`[orders/updated] Fallback lookup found user ${nfwUserId} with claim_month ${claimMonth}`);
          } else {
            console.log(`[orders/updated] No claim found for order ${orderId}`);
            
            // Second fallback: try by checkout_id from the order
            const orderCheckoutId = order.checkout_id ? `gid://shopify/Checkout/${order.checkout_id}` : null;
            if (orderCheckoutId) {
              const { data: claimByCheckoutId } = await supabaseAdmin
                .from("zero_dollar_claims")
                .select("user_id, claim_month")
                .eq("shopify_checkout_id", orderCheckoutId)
                .limit(1);
              
              if (claimByCheckoutId && claimByCheckoutId.length > 0) {
                nfwUserId = claimByCheckoutId[0].user_id;
                claimMonth = claimByCheckoutId[0].claim_month;
                console.log(`[orders/updated] Checkout fallback found user ${nfwUserId} with claim_month ${claimMonth}`);
              } else {
                console.log(`[orders/updated] No claim found for checkout_id ${orderCheckoutId}`);
              }
            }
          }
        }

        // Also compute claimMonth from order date as fallback
        if (!claimMonth) {
          const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
          claimMonth = new Date(
            orderCreatedAt.getFullYear(),
            orderCreatedAt.getMonth(),
            1
          ).toISOString().split("T")[0];
        }

        if (nfwUserId) {
          // Release pending checkout lock on cancellation
          const { error: deletePendingError } = await supabaseAdmin
            .from("pending_monthly_claims")
            .delete()
            .eq("user_id", nfwUserId)
            .eq("claim_month", claimMonth);

          if (deletePendingError) {
            console.error("Failed to delete pending claim on cancellation:", deletePendingError);
          }

          // Cancel user's claim for this month
          const monthStart = `${claimMonth}T00:00:00`;
          const { error: updateClaimError } = await supabaseAdmin
            .from("zero_dollar_claims")
            .update({ status: "cancelled" })
            .eq("user_id", nfwUserId)
            .in("status", ["created", "completed", "fulfilled"])
            .gte("claimed_at", monthStart);

          if (updateClaimError) {
            console.error("Failed to cancel claim on order cancellation:", updateClaimError);
          }

          console.log(
            `Order cancelled. User ${nfwUserId} checkout reset for ${claimMonth}. Reason: ${cancelReason}`
          );
        }
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

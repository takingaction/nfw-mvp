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
      const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
      const claimMonth = new Date(orderCreatedAt.getFullYear(), orderCreatedAt.getMonth(), 1).toISOString().split('T')[0];

      if (variantId) {
        // Extract nfw_user_id and nfw_checkout_time from order attributes (passed during checkout)
        const orderAttributes = order.attributes || [];
        const nfwUserIdAttr = orderAttributes.find((attr: { name: string; value: string }) => attr.name === "nfw_user_id");
        const nfwCheckoutTimeAttr = orderAttributes.find((attr: { name: string; value: string }) => attr.name === "nfw_checkout_time");
        const nfwUserId = nfwUserIdAttr?.value || null;
        const nfwCheckoutTime = nfwCheckoutTimeAttr ? parseInt(nfwCheckoutTimeAttr.value, 10) : null;

        // Check if checkout URL has expired (2 hour limit)
        const checkoutExpirationMs = 2 * 60 * 60 * 1000; // 2 hours
        if (!nfwCheckoutTime || (Date.now() - nfwCheckoutTime > checkoutExpirationMs)) {
          console.log(`Rejecting order ${orderId} - checkout URL expired or missing timestamp. Timestamp: ${nfwCheckoutTime}, Age: ${nfwCheckoutTime ? Date.now() - nfwCheckoutTime : 'N/A'}ms`);
          return NextResponse.json({ received: true, reason: "Checkout URL expired" });
        }

        // First try to find claim by variant_id (correct path)
        let { data: existingClaims } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_variant_id", variantId)
          .eq("status", "created")
          .order("claimed_at", { ascending: true })
          .limit(1);

        // If no claim found by variant_id, try by user_id + product_id (handles case where wrong variant was recorded)
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
          }
        }

        // Third fallback: try by shopify_checkout_id (checkout ID stored when claim created)
        if ((!existingClaims || existingClaims.length === 0) && checkoutId) {
          const { data: claimsByCheckout } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("*")
            .eq("shopify_checkout_id", checkoutId)
            .eq("status", "created")
            .limit(1);
          
          if (claimsByCheckout && claimsByCheckout.length > 0) {
            existingClaims = claimsByCheckout;
            console.log(`Found claim ${existingClaims[0].id} via checkout_id fallback`);
            
            // Update shopify_checkout_id to the real Shopify GID format
            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ shopify_checkout_id: checkoutId })
              .eq("id", existingClaims[0].id);
            console.log(`Updated shopify_checkout_id to ${checkoutId}`);
          }
        }

        if (existingClaims && existingClaims.length > 0) {
          const claim = existingClaims[0];

          // Validate nfw_user_id matches the claim's user_id (prevents direct Shopify checkout fraud)
          if (!nfwUserId || nfwUserId !== claim.user_id) {
            console.log(`Rejecting order ${orderId} - invalid or missing nfw_user_id attribute. Expected: ${claim.user_id}, Got: ${nfwUserId}`);

            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ status: "rejected_invalid_user" })
              .eq("id", claim.id);

            return NextResponse.json({ received: true, reason: "Invalid user" });
          }

          // Check if user already has a monthly claim this month
          const { data: existingMonthlyClaim } = await supabaseAdmin
            .from("monthly_claims")
            .select("id")
            .eq("user_id", claim.user_id)
            .eq("claim_month", claimMonth)
            .limit(1);

          if (existingMonthlyClaim && existingMonthlyClaim.length > 0) {
            // User already completed a claim this month, reject this one
            console.log(`Rejecting claim ${claim.id} - user ${claim.user_id} already has monthly claim for ${claimMonth}`);

            // Update claim status to rejected
            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ status: "rejected_monthly_limit" })
              .eq("id", claim.id);

            return NextResponse.json({ received: true, reason: "Monthly limit exceeded" });
          }

          // Record monthly claim before updating claim status
          await supabaseAdmin.from("monthly_claims").insert({
            user_id: claim.user_id,
            claim_month: claimMonth,
          });

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
        } else {
          console.log("No matching claim found for variant", variantId);
        }
      } else {
        console.log("No variant ID in order:", order);
      }
    }

    if (topic === "orders/updated") {
      const order = event;
      const cancelReason = order.cancel_reason;

      // Only process if order was cancelled (any cancellation - including fulfilled orders)
      if (cancelReason) {
        const orderAttributes = order.attributes || [];
        const nfwUserIdAttr = orderAttributes.find(
          (attr: { name: string; value: string }) => attr.name === "nfw_user_id"
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
          // 1. Delete monthly_claims record
          const { error: deleteMonthlyError } = await supabaseAdmin
            .from("monthly_claims")
            .delete()
            .eq("user_id", nfwUserId)
            .eq("claim_month", claimMonth);

          if (deleteMonthlyError) {
            console.error("Failed to delete monthly claim on cancellation:", deleteMonthlyError);
          }

          // 2. Find and cancel user's claim for this month (match by user_id + same month)
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
            `Order cancelled. User ${nfwUserId} monthly limit reset for ${claimMonth}. Reason: ${cancelReason}`
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

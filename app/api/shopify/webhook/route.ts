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

function parseDraftOrderNote(note: string | null): Record<string, string> | null {
  if (!note) return null;

  const result: Record<string, string> = {};
  const parts = note.split('|');

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex > 0) {
      const key = part.substring(0, colonIndex);
      const value = part.substring(colonIndex + 1);
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
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

    console.log(`[webhook] Received ${topic} at ${new Date().toISOString()}`);

    // =====================================================================
    // ORDERS/CREATE - New order completed
    // =====================================================================
    if (topic === "orders/create") {
      const order = event;
      const orderId = `gid://shopify/Order/${order.id}`;
      
      // Get checkout_id from order - this is the PRIMARY match key
      // With Checkout API (Storefront), checkout_id survives to the order
      const checkoutId = order.checkout_id 
        ? `gid://shopify/Checkout/${order.checkout_id}` 
        : null;
      
      const lineItems = order.line_items || [];
      
      // Get draft_order_id if present (from Draft Orders API)
      const draftOrderId = order.draft_order_id 
        ? `draft_${order.draft_order_id}` 
        : null;
      
      console.log(`[orders/create] Order ID: ${orderId}, draft_order_id: ${draftOrderId}, checkout_id: ${checkoutId}`);

      if (lineItems.length === 0) {
        console.log(`[orders/create] No line items, skipping`);
        return NextResponse.json({ received: true });
      }

      const variantId = lineItems[0].variant_id
        ? `gid://shopify/ProductVariant/${lineItems[0].variant_id}`
        : null;
      
      console.log(`[orders/create] Variant ID: ${variantId}`);

      // Parse note for claim identification (Draft Orders use note field)
      const noteData = parseDraftOrderNote(order.note);
      const claimIdFromNote = noteData?.claim_id;
      console.log(`[orders/create] Note: ${order.note}, claimIdFromNote: ${claimIdFromNote}`);

      // Get tracking info if available
      const fulfillment = order.fulfillments?.[0];
      const trackingNumber = fulfillment?.tracking_number || null;
      const trackingUrl = fulfillment?.tracking_url || null;
      const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
      const claimMonth = `${orderCreatedAt.getFullYear()}-${String(orderCreatedAt.getMonth() + 1).padStart(2, "0")}-01`;

      // =====================================================================
      // PRIMARY MATCH: draft_order_id exact match (most reliable)
      // With Draft Orders API, draft_order_id persists to the order
      // =====================================================================
      let existingClaim = null;
      let matchMethod = "none";

      if (draftOrderId) {
        const { data: claimByDraftOrder } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_checkout_id", draftOrderId)
          .eq("status", "created")
          .limit(1);
        
        if (claimByDraftOrder && claimByDraftOrder.length > 0) {
          existingClaim = claimByDraftOrder[0];
          matchMethod = "draft_order_id";
          console.log(`[orders/create] Found claim ${existingClaim.id} via draft_order_id exact match`);
        }
      }

      // =====================================================================
      // FALLBACK: shopify_checkout_id exact match (for Cart API orders)
      // Cart API creates checkout_id that survives to the order
      // =====================================================================

      // =====================================================================
      // PRIMARY: claim_id from note (most reliable for Draft Orders)
      // Note format: claim_id:xxx|user_id:xxx|checkout_time:xxx
      // =====================================================================
      if (!existingClaim && claimIdFromNote) {
        const { data: claimByNoteId } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("id", claimIdFromNote)
          .eq("status", "created")
          .limit(1);

        if (claimByNoteId && claimByNoteId.length > 0) {
          existingClaim = claimByNoteId[0];
          matchMethod = "claim_id_from_note";
          console.log(`[orders/create] Found claim ${existingClaim.id} via claim_id from note`);
        }
      }

      if (!existingClaim && checkoutId) {
        const { data: claimByCheckout } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_checkout_id", checkoutId)
          .eq("status", "created")
          .limit(1);
        
        if (claimByCheckout && claimByCheckout.length > 0) {
          existingClaim = claimByCheckout[0];
          matchMethod = "checkout_id";
          console.log(`[orders/create] Found claim ${existingClaim.id} via checkout_id exact match`);
        }
      }

      // =====================================================================
      // FALLBACK: Try variant_id match (less reliable - same variant can be claimed by multiple users)
      // =====================================================================
      if (!existingClaim && variantId) {
        const { data: claimByVariant } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_variant_id", variantId)
          .eq("status", "created")
          .order("claimed_at", { ascending: true })
          .limit(1);
        
        if (claimByVariant && claimByVariant.length > 0) {
          existingClaim = claimByVariant[0];
          matchMethod = "variant_id";
          console.log(`[orders/create] Found claim ${existingClaim.id} via variant_id fallback`);
        }
      }

      // =====================================================================
      // FALLBACK: Try by user_id + product_id using customAttributes
      // =====================================================================
      if (!existingClaim) {
        // Try to extract nfw_user_id from customAttributes (Checkout API preserves these)
        const customAttributes = order.custom_attributes || [];
        const nfwUserIdAttr = customAttributes.find(
          (attr: { key?: string; value: string }) => attr.key === "nfw_user_id"
        );
        const nfwClaimIdAttr = customAttributes.find(
          (attr: { key?: string; value: string }) => attr.key === "nfw_claim_id"
        );
        
        const nfwUserId = nfwUserIdAttr?.value || null;
        const nfwClaimId = nfwClaimIdAttr?.value || null;

        // Try direct claim ID match first (most reliable when available)
        if (nfwClaimId) {
          const { data: claimById } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("*")
            .eq("id", nfwClaimId)
            .eq("status", "created")
            .limit(1);
          
          if (claimById && claimById.length > 0) {
            existingClaim = claimById[0];
            matchMethod = "claim_id";
            console.log(`[orders/create] Found claim ${existingClaim.id} via claim_id from customAttributes`);
          }
        }
        
        // Try user_id + product_id match
        if (!existingClaim && nfwUserId) {
          const productId = `gid://shopify/Product/${lineItems[0].product_id}`;
          const { data: claimByUser } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("*")
            .eq("user_id", nfwUserId)
            .eq("shopify_product_id", productId)
            .eq("status", "created")
            .order("claimed_at", { ascending: true })
            .limit(1);
          
          if (claimByUser && claimByUser.length > 0) {
            existingClaim = claimByUser[0];
            matchMethod = "user_product";
            console.log(`[orders/create] Found claim ${existingClaim.id} via user_id+product_id fallback`);
          }
        }
      }

      // =====================================================================
      // Process matched claim
      // =====================================================================
      if (existingClaim) {
        const claim = existingClaim;

        // Validate user if we have nfw_user_id (defense in depth)
        // Skip validation if found via checkout_id (primary path)
        if (matchMethod !== "checkout_id") {
          const customAttributes = order.custom_attributes || [];
          const nfwUserIdAttr = customAttributes.find(
            (attr: { key?: string; value: string }) => attr.key === "nfw_user_id"
          );
          const nfwUserId = nfwUserIdAttr?.value || null;

          if (nfwUserId && nfwUserId !== claim.user_id) {
            console.log(`[orders/create] REJECTING order ${orderId} - user mismatch. Claim user: ${claim.user_id}, Order user: ${nfwUserId}`);

            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ status: "rejected_invalid_user" })
              .eq("id", claim.id);

            return NextResponse.json({ received: true, reason: "Invalid user" });
          }
        }

        // Determine new status
        const newStatus = trackingNumber ? "fulfilled" : "completed";
        const completedAt = new Date().toISOString();

        // Update claim
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
            checkout_completed_at: completedAt,
          })
          .eq("id", claim.id);

        if (updateError) {
          console.error("[orders/create] Failed to update claim:", updateError);
        } else {
          console.log(`[orders/create] Updated claim ${claim.id} to ${newStatus}`);
        }

        // Release pending checkout lock using the shopify_checkout_id we stored (draft_xxx format)
        // Use claim.shopify_checkout_id which contains the draft_xxx we inserted, not the webhook's gid://shopify/Checkout/xxx
        if (claim.shopify_checkout_id) {
          const { error: deletePendingError } = await supabaseAdmin
            .from("pending_monthly_claims")
            .delete()
            .eq("shopify_checkout_id", claim.shopify_checkout_id);

          if (deletePendingError) {
            console.error("[orders/create] Failed to delete pending claim:", deletePendingError);
          } else {
            console.log(`[orders/create] Deleted pending claim for user ${claim.user_id}, checkout_id ${claim.shopify_checkout_id}`);
          }
        }

        return NextResponse.json({ received: true });
      }

      // No matching claim found
      console.log(`[orders/create] No matching claim found for order ${orderId}. checkout_id=${checkoutId}, variant=${variantId}`);
      return NextResponse.json({ received: true, reason: "No matching claim" });
    }

    // =====================================================================
    // ORDERS/UPDATED - Order cancelled or fulfilled
    // =====================================================================
    if (topic === "orders/updated") {
      const order = event;
      const cancelReason = order.cancel_reason;
      const orderId = `gid://shopify/Order/${order.id}`;

      // Only process if order was cancelled
      if (!cancelReason) {
        return NextResponse.json({ received: true });
      }

      console.log(`[orders/updated] Order ${orderId} cancelled. Reason: ${cancelReason}`);

      // Get checkout_id to find the claim
      const checkoutId = order.checkout_id
        ? `gid://shopify/Checkout/${order.checkout_id}`
        : null;

      // Parse note for claim identification (Draft Orders use note field)
      const noteData = parseDraftOrderNote(order.note);
      const claimIdFromNote = noteData?.claim_id;
      const userIdFromNote = noteData?.user_id;
      console.log(`[orders/updated] Note: ${order.note}, claimIdFromNote: ${claimIdFromNote}, userIdFromNote: ${userIdFromNote}`);

      // Try to find claim by checkout_id first
      let nfwUserId = null;
      let claimMonth: string | null = null;

      // =====================================================================
      // PRIMARY: claim_id from note (most reliable for Draft Orders)
      // Note format: claim_id:xxx|user_id:xxx|checkout_time:xxx
      // =====================================================================
      if (claimIdFromNote) {
        const { data: claimById } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("user_id, claim_month")
          .eq("id", claimIdFromNote)
          .limit(1);

        if (claimById && claimById.length > 0) {
          nfwUserId = claimById[0].user_id;
          claimMonth = claimById[0].claim_month;
          console.log(`[orders/updated] Found claim via claim_id from note: user=${nfwUserId}`);
        }
      }

      if (checkoutId) {
        const { data: claimByCheckout } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("user_id, claim_month")
          .eq("shopify_checkout_id", checkoutId)
          .limit(1);

        if (claimByCheckout && claimByCheckout.length > 0) {
          nfwUserId = claimByCheckout[0].user_id;
          claimMonth = claimByCheckout[0].claim_month;
          console.log(`[orders/updated] Found claim via checkout_id: user=${nfwUserId}`);
        }
      }

      // Fallback: try by order_id
      if (!nfwUserId) {
        const { data: claimByOrder } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("user_id, claim_month")
          .eq("shopify_order_id", orderId)
          .limit(1);

        if (claimByOrder && claimByOrder.length > 0) {
          nfwUserId = claimByOrder[0].user_id;
          claimMonth = claimByOrder[0].claim_month;
          console.log(`[orders/updated] Found claim via order_id: user=${nfwUserId}`);
        }
      }

      // Fallback: try by variant_id + most recent pending claim for user
      if (!nfwUserId && order.line_items?.[0]?.variant_id) {
        const variantId = `gid://shopify/ProductVariant/${order.line_items[0].variant_id}`;
        const productId = `gid://shopify/Product/${order.line_items[0].product_id}`;
        
        // Get nfw_user_id from custom attributes if available
        const customAttributes = order.custom_attributes || [];
        const nfwUserIdAttr = customAttributes.find(
          (attr: { key?: string; value: string }) => attr.key === "nfw_user_id"
        );
        
        if (nfwUserIdAttr) {
          nfwUserId = nfwUserIdAttr.value;
          
          const { data: claimByUser } = await supabaseAdmin
            .from("zero_dollar_claims")
            .select("user_id, claim_month")
            .eq("user_id", nfwUserId)
            .eq("shopify_product_id", productId)
            .in("status", ["created", "pending"])
            .order("claimed_at", { ascending: false })
            .limit(1);

          if (claimByUser && claimByUser.length > 0) {
            claimMonth = claimByUser[0].claim_month;
            console.log(`[orders/updated] Found claim via user_id fallback: user=${nfwUserId}`);
          }
        }
      }

      // Compute claimMonth from order date as fallback
      if (!claimMonth) {
        const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
        claimMonth = `${orderCreatedAt.getFullYear()}-${String(orderCreatedAt.getMonth() + 1).padStart(2, "0")}-01`;
      }

      if (nfwUserId) {
        // Release pending checkout lock using shopify_checkout_id (the draft_xxx or checkout_xxx we stored)
        const { error: deletePendingError } = await supabaseAdmin
          .from("pending_monthly_claims")
          .delete()
          .eq("shopify_checkout_id", checkoutId);

        if (deletePendingError) {
          console.error("[orders/updated] Failed to delete pending claim:", deletePendingError);
        }

        // Cancel the user's claim - match by user_id and claim_month regardless of status
        // (cancelled orders may still show as 'completed' in zero_dollar_claims)
        const { error: updateClaimError } = await supabaseAdmin
          .from("zero_dollar_claims")
          .update({ status: "cancelled" })
          .eq("user_id", nfwUserId)
          .eq("claim_month", claimMonth);

        if (updateClaimError) {
          console.error("[orders/updated] Failed to cancel claim:", updateClaimError);
        }

        console.log(`[orders/updated] Cancelled claim for user ${nfwUserId}, month ${claimMonth}`);
      } else {
        console.log(`[orders/updated] Could not find claim to cancel for order ${orderId}`);
      }

      return NextResponse.json({ received: true });
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

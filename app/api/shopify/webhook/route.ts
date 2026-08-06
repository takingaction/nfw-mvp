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
      // PRIMARY MATCH: claim_id from note (most reliable)
      // Note format: claim_id:xxx|user_id:xxx|checkout_time:xxx
      // Extract nfw_user_id for validation
      // =====================================================================
      const customAttributes = order.custom_attributes || [];
      const nfwUserIdAttr = customAttributes.find(
        (attr: { key?: string; value: string }) => attr.key === "nfw_user_id"
      );
      const nfwUserId = nfwUserIdAttr?.value || null;

      let existingClaim = null;
      let matchMethod = "none";

      if (claimIdFromNote) {
        const { data: claimByNoteId } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("id", claimIdFromNote)
          .limit(1);

        if (claimByNoteId && claimByNoteId.length > 0) {
          existingClaim = claimByNoteId[0];
          matchMethod = "claim_id_from_note";
          console.log(`[orders/create] Found claim ${existingClaim.id} via claim_id from note`);
        }
      }

      // Skip if claim is already cancelled
      if (existingClaim?.status === "cancelled") {
        console.log(`[orders/create] Claim ${existingClaim.id} is cancelled, skipping`);
        return NextResponse.json({ received: true });
      }

      // =====================================================================
      // SECONDARY: checkout_id exact match (for Cart API orders)
      // =====================================================================
      if (!existingClaim && checkoutId) {
        const { data: claimByCheckout } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_checkout_id", checkoutId)
          .limit(1);
        
        if (claimByCheckout && claimByCheckout.length > 0) {
          existingClaim = claimByCheckout[0];
          matchMethod = "checkout_id";
          console.log(`[orders/create] Found claim ${existingClaim.id} via checkout_id exact match`);
        }
      }

      // =====================================================================
      // LAST RESORT: draft_order_id match
      // =====================================================================
      if (!existingClaim && draftOrderId) {
        const { data: claimByDraftOrder } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("*")
          .eq("shopify_checkout_id", draftOrderId)
          .limit(1);
        
        if (claimByDraftOrder && claimByDraftOrder.length > 0) {
          existingClaim = claimByDraftOrder[0];
          matchMethod = "draft_order_id";
          console.log(`[orders/create] Found claim ${existingClaim.id} via draft_order_id exact match`);
        }
      }

      // =====================================================================
      // USER VALIDATION (REQUIRED for all match methods)
      // If nfw_user_id is present in webhook, validate it matches claim.user_id
      // =====================================================================
      if (existingClaim && nfwUserId) {
        if (nfwUserId !== existingClaim.user_id) {
          console.log(`[orders/create] REJECTING order ${orderId} - user mismatch. Claim user: ${existingClaim.user_id}, Order user: ${nfwUserId}`);

          await supabaseAdmin
            .from("zero_dollar_claims")
            .update({ status: "rejected_invalid_user" })
            .eq("id", existingClaim.id);

          return NextResponse.json({ received: true, reason: "Invalid user" });
        }
      }

      // =====================================================================
      // Process matched claim
      // =====================================================================
      if (existingClaim) {
        // Determine new status
        const newStatus = trackingNumber ? "fulfilled" : "completed";
        const completedAt = new Date().toISOString();

        // Update claim - preserve existing claim_month if already set (don't overwrite with order date)
        const updateData: Record<string, unknown> = {
          status: newStatus,
          shopify_order_id: orderId,
          shopify_checkout_id: checkoutId || orderId,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          order_status_url: order.order_status_url || null,
          checkout_completed_at: completedAt,
        };
        
        // Only set claim_month if not already set (preserves original checkout month)
        if (!existingClaim.claim_month) {
          updateData.claim_month = claimMonth;
        }
        
        const { error: updateError } = await supabaseAdmin
          .from("zero_dollar_claims")
          .update(updateData)
          .eq("id", existingClaim.id);

        if (updateError) {
          console.error("[orders/create] Failed to update claim:", updateError);
        } else {
          console.log(`[orders/create] Updated claim ${existingClaim.id} to ${newStatus}`);
        }

        // Release pending checkout lock using the shopify_checkout_id we stored (draft_xxx format)
        // Use existingClaim.shopify_checkout_id which contains the draft_xxx we inserted, not the webhook's gid://shopify/Checkout/xxx
        if (existingClaim.shopify_checkout_id) {
          const { error: deletePendingError } = await supabaseAdmin
            .from("pending_monthly_claims")
            .delete()
            .eq("shopify_checkout_id", existingClaim.shopify_checkout_id);

          if (deletePendingError) {
            console.error("[orders/create] Failed to delete pending claim:", deletePendingError);
          } else {
            console.log(`[orders/create] Deleted pending claim for user ${existingClaim.user_id}, checkout_id ${existingClaim.shopify_checkout_id}`);
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

      // Store the claim's shopify_checkout_id for deleting from pending_monthly_claims
      let claimCheckoutId: string | null = null;

      // =====================================================================
      // PRIMARY: claim_id from note (most reliable for Draft Orders)
      // Note format: claim_id:xxx|user_id:xxx|checkout_time:xxx
      // =====================================================================
      if (claimIdFromNote) {
        const { data: claimById } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("user_id, claim_month, shopify_checkout_id")
          .eq("id", claimIdFromNote)
          .limit(1);

        if (claimById && claimById.length > 0) {
          nfwUserId = claimById[0].user_id;
          claimMonth = claimById[0].claim_month;
          claimCheckoutId = claimById[0].shopify_checkout_id;
          console.log(`[orders/updated] Found claim via claim_id from note: user=${nfwUserId}, checkout=${claimCheckoutId}`);
        }
      }

      // Try checkout_id if we haven't found the claim yet
      if (!nfwUserId && checkoutId) {
        const { data: claimByCheckout } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("user_id, claim_month, shopify_checkout_id")
          .eq("shopify_checkout_id", checkoutId)
          .limit(1);

        if (claimByCheckout && claimByCheckout.length > 0) {
          nfwUserId = claimByCheckout[0].user_id;
          claimMonth = claimByCheckout[0].claim_month;
          claimCheckoutId = claimByCheckout[0].shopify_checkout_id;
          console.log(`[orders/updated] Found claim via checkout_id: user=${nfwUserId}`);
        }
      }

      // Last resort: try by order_id
      if (!nfwUserId) {
        const { data: claimByOrder } = await supabaseAdmin
          .from("zero_dollar_claims")
          .select("user_id, claim_month, shopify_checkout_id")
          .eq("shopify_order_id", orderId)
          .limit(1);

        if (claimByOrder && claimByOrder.length > 0) {
          nfwUserId = claimByOrder[0].user_id;
          claimMonth = claimByOrder[0].claim_month;
          claimCheckoutId = claimByOrder[0].shopify_checkout_id;
          console.log(`[orders/updated] Found claim via order_id: user=${nfwUserId}`);
        }
      }

      // NOTE: variant_id fallback has been REMOVED - it was too dangerous as it could match
      // the wrong user's claim. If we can't find the claim via claim_id, checkout_id, or order_id,
      // we cannot securely cancel it.

      // Compute claimMonth from order date as fallback
      if (!claimMonth) {
        const orderCreatedAt = order.created_at ? new Date(order.created_at) : new Date();
        claimMonth = `${orderCreatedAt.getFullYear()}-${String(orderCreatedAt.getMonth() + 1).padStart(2, "0")}-01`;
      }

      if (nfwUserId) {
        // Release pending checkout lock using the claim's shopify_checkout_id (the draft_xxx or checkout_xxx we stored)
        // NOT the webhook's checkoutId (gid://shopify/Checkout/xxx)
        const pendingCheckoutId = claimCheckoutId || checkoutId;
        if (pendingCheckoutId) {
          const { error: deletePendingError } = await supabaseAdmin
            .from("pending_monthly_claims")
            .delete()
            .eq("shopify_checkout_id", pendingCheckoutId);

          if (deletePendingError) {
            console.error("[orders/updated] Failed to delete pending claim:", deletePendingError);
          } else {
            console.log(`[orders/updated] Deleted pending claim for user ${nfwUserId}, checkout_id ${pendingCheckoutId}`);
          }
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

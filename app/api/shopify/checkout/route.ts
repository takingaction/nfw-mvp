import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getShopifyAccessToken } from "@/lib/shopify";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createDraftOrderShopify(variantId: string, quantity: number, claimId: string, userId: string) {
  const accessToken = await getShopifyAccessToken();
  if (!accessToken) {
    throw new Error("No Shopify access token available");
  }

  const storeDomain = process.env.SHOPIFY_SHOP_DOMAIN;

  // Extract numeric variant ID from GID format
  const variantIdMatch = variantId.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/);
  if (!variantIdMatch) {
    throw new Error("Invalid variant ID format");
  }
  const numericVariantId = variantIdMatch[1];

  // Build note with all tracking info
  const checkoutTime = Date.now();
  const note = `claim_id:${claimId}|user_id:${userId}|checkout_time:${checkoutTime}`;

  const response = await fetch(
    `https://${storeDomain}/admin/api/2026-01/draft_orders.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        draft_order: {
          line_items: [
            {
              variant_id: parseInt(numericVariantId, 10),
              quantity: quantity,
            }
          ],
          note: note,
        }
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Draft Order error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.draft_order;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`shopify-checkout:${ip}`, 5, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Verify authentication - userId must match authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Shopify checkout is enabled via system_settings
    const { data: systemSettings } = await supabaseAdmin
      .from("system_settings")
      .select("shopify_checkout_enabled")
      .eq("id", "00000000-0000-0000-0000-000000000002")
      .single();

    if (systemSettings?.shopify_checkout_enabled === false) {
      return NextResponse.json(
        {
          error: "Store is temporarily unavailable. Please try again later.",
          shopify_unavailable: true
        },
        { status: 503 }
      );
    }

    const { variantId, productId, userId } = await request.json();

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return NextResponse.json(
        { error: "Invalid user" },
        { status: 403 }
      );
    }

    // Fetch profile for all checks
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("joined_at, profile_completed")
      .eq("id", userId)
      .single();

    // Check profile completion (always required)
    if (!profile?.profile_completed) {
      return NextResponse.json(
        { error: "Please complete your profile to claim items" },
        { status: 403 }
      );
    }

    // Check account age (minimum 48 hours before claiming) - disabled via ACCOUNT_AGE_CHECK_ENABLED env var
    const isAccountAgeCheckEnabled = process.env.ACCOUNT_AGE_CHECK_ENABLED !== "false";
    if (isAccountAgeCheckEnabled && profile?.joined_at) {
      const joinedAt = new Date(profile.joined_at);
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      if (joinedAt > fortyEightHoursAgo) {
        return NextResponse.json(
          { error: "Your account must be at least 48 hours old before claiming items" },
          { status: 403 }
        );
      }
    }

    if (!variantId || !productId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse variant ID - ensure it's in GID format
    const variantIdMatch = variantId.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/);
    if (!variantIdMatch) {
      return NextResponse.json(
        { error: "Invalid variant ID format" },
        { status: 400 }
      );
    }

    // Check monthly limit (1 per month, any product) - THIS IS NOW THE FIRST CHECK
    const now = new Date();
    const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    
    // Step 0: Check for existing pending claim FIRST (before ANY inserts)
    const { data: existingPending } = await supabaseAdmin
      .from("pending_monthly_claims")
      .select("id")
      .eq("user_id", userId)
      .eq("claim_month", claimMonth)
      .limit(1);

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json(
        { error: "You have a checkout already in progress this month" },
        { status: 400 }
      );
    }

    // Step 1: Check lifetime duplicate (1 per product per user)
    const { data: existingClaim } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select("id, status")
      .eq("user_id", userId)
      .eq("shopify_product_id", productId)
      .in("status", ["completed", "fulfilled", "paid"])
      .limit(1);

    if (existingClaim && existingClaim.length > 0) {
      return NextResponse.json(
        { error: "You have already claimed this product" },
        { status: 400 }
      );
    }

    // Step 3: INSERT zero_dollar_claims FIRST to get the real UUID
    // We need the real claim ID BEFORE calling Shopify so we can put it in the note
    const { data: claimData, error: claimInsertError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: userId,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: null, // Will be updated after Shopify order is created
        status: "created",
        shipping_address: { placeholder: true },
        claimed_at: now.toISOString(),
        claim_month: claimMonth,
      })
      .select("id")
      .single();

    if (claimInsertError) {
      console.error("[checkout] Error inserting claim:", claimInsertError);
      return NextResponse.json(
        { error: "Failed to create claim" },
        { status: 500 }
      );
    }

    const claimId = claimData.id;
    console.log(`[checkout] Created claim ${claimId} for user ${userId}`);

    // Step 4: INSERT pending_monthly_claims (lock using real claim ID)
    const { error: pendingError } = await supabaseAdmin
      .from("pending_monthly_claims")
      .insert({
        user_id: userId,
        claim_month: claimMonth,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: null, // Will be updated after Shopify order is created
      });

    if (pendingError) {
      console.error("[checkout] Error inserting pending claim:", pendingError);
      // Rollback: delete the claim we just created
      await supabaseAdmin
        .from("zero_dollar_claims")
        .delete()
        .eq("id", claimId);
      return NextResponse.json(
        { error: "You have a checkout already in progress this month" },
        { status: 400 }
      );
    }

    console.log(`[checkout] Inserted pending_monthly_claims for user ${userId}, month ${claimMonth}`);

    // Step 5: Create Shopify Draft Order via Admin API
    let draftOrderId: string;
    let checkoutUrl: string;

    try {
      // Use the REAL claim ID for Shopify note (not a temp ID)
      const draftOrder = await createDraftOrderShopify(variantId, 1, claimId, userId);
      
      // draftOrder.id is the Shopify draft order ID (numeric string)
      // We prefix with "draft_" to distinguish from cart IDs
      draftOrderId = `draft_${draftOrder.id}`;
      checkoutUrl = draftOrder.invoice_url;

      console.log(`[checkout] Created Shopify draft order ${draftOrderId}`);

    } catch (shopifyError) {
      // Shopify failed - rollback both entries
      console.error("[checkout] Shopify error:", shopifyError);
      await supabaseAdmin.from("pending_monthly_claims").delete().eq("user_id", userId).eq("claim_month", claimMonth);
      await supabaseAdmin.from("zero_dollar_claims").delete().eq("id", claimId);
      return NextResponse.json(
        { error: shopifyError instanceof Error ? shopifyError.message : "Failed to create Shopify checkout" },
        { status: 500 }
      );
    }

    // Step 6: UPDATE both tables with draft_order_id
    const { error: pendingUpdateError } = await supabaseAdmin
      .from("pending_monthly_claims")
      .update({ shopify_checkout_id: draftOrderId })
      .eq("user_id", userId)
      .eq("claim_month", claimMonth);

    if (pendingUpdateError) {
      console.error("[checkout] Error updating pending with draft_order_id:", pendingUpdateError);
      // Non-fatal - we can still look up by user_id + claim_month in webhook
    }

    const { error: claimUpdateError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .update({ shopify_checkout_id: draftOrderId })
      .eq("id", claimId);

    if (claimUpdateError) {
      console.error("[checkout] Error updating claim with draft_order_id:", claimUpdateError);
      // Non-fatal - the claim exists with the right status
    }

    console.log(`[checkout] Checkout complete for claim ${claimId}`);

    return NextResponse.json({
      checkoutUrl,
      checkoutId: draftOrderId,
      remainingThisMonth: 0,
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

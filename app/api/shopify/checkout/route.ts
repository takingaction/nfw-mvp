import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHOPIFY_STOREFRONT_API_URL = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/api/2026-04/graphql.json`;

async function shopifyGraphQL(query: string, variables: Record<string, any>) {
  const response = await fetch(SHOPIFY_STOREFRONT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
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

    // Check lifetime claim limit (1 per product per user)
    // Only block if there's a COMPLETED claim - allow re-claim if previous attempt was abandoned
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

    // Check monthly limit (1 per month, any product)
    const now = new Date();
    const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    
    const { data: monthlyClaim } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select("id")
      .eq("user_id", userId)
      .eq("claim_month", claimMonth)
      .in("status", ["completed", "fulfilled", "paid"])
      .limit(1);

    if (monthlyClaim && monthlyClaim.length > 0) {
      return NextResponse.json(
        { error: "You have already claimed a product this month" },
        { status: 400 }
      );
    }

    // Step 1: Insert zero_dollar_claims with status='pending' (no checkout_id yet)
    const { data: claimData, error: claimInsertError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: userId,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: null, // Will be updated after Shopify creates checkout
        status: "pending",
        shipping_address: { placeholder: true },
        claimed_at: now.toISOString(),
        claim_month: claimMonth,
      })
      .select("id")
      .single();

    if (claimInsertError) {
      console.error("Error inserting claim:", claimInsertError);
      return NextResponse.json(
        { error: "Failed to create claim" },
        { status: 500 }
      );
    }

    const claimId = claimData.id;

    console.log(`[checkout] Created pending claim ${claimId} for user ${userId}`);

    // Step 2: Create Shopify Checkout via Storefront GraphQL API
    let checkoutId: string;
    let checkoutUrl: string;

    try {
      const cartCreateMutation = `
        mutation CreateCart($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const input = {
        lines: [{
          merchandiseId: variantId,
          quantity: 1
        }],
        customAttributes: [
          { key: "nfw_user_id", value: userId },
          { key: "nfw_claim_id", value: claimId }
        ]
      };

      const result = await shopifyGraphQL(cartCreateMutation, { input });

      if (result.cartCreate.userErrors?.length > 0) {
        const error = result.cartCreate.userErrors[0];
        throw new Error(`Cart error: ${error.message}`);
      }

      const cart = result.cartCreate.cart;
      checkoutId = cart.id;
      checkoutUrl = cart.checkoutUrl;

      console.log(`[checkout] Created Shopify cart ${checkoutId} for claim ${claimId}`);

    } catch (shopifyError) {
      // Clean up the pending claim on Shopify error
      await supabaseAdmin
        .from("zero_dollar_claims")
        .delete()
        .eq("id", claimId);

      console.error("[checkout] Shopify error:", shopifyError);
      return NextResponse.json(
        { error: shopifyError instanceof Error ? shopifyError.message : "Failed to create Shopify checkout" },
        { status: 500 }
      );
    }

    // Step 3: Update claim with checkout_id and status='created'
    const { error: claimUpdateError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .update({
        shopify_checkout_id: checkoutId,
        status: "created"
      })
      .eq("id", claimId);

    if (claimUpdateError) {
      console.error("[checkout] Error updating claim with checkout_id:", claimUpdateError);
      // Non-fatal - checkout was created, we can still look up by checkout_id in webhook
    }

    // Step 4: Insert pending_monthly_claims with checkout_id for monthly limit lock
    const { error: pendingError } = await supabaseAdmin
      .from("pending_monthly_claims")
      .insert({
        user_id: userId,
        claim_month: claimMonth,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: checkoutId,
      });

    if (pendingError) {
      console.error("[checkout] Error inserting pending claim:", pendingError);
      // Non-fatal - we have the claim in zero_dollar_claims
    }

    console.log(`[checkout] Completed for claim ${claimId}, cart ${checkoutId}`);

    return NextResponse.json({
      checkoutUrl,
      checkoutId,
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

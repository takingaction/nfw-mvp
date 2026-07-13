import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Parse variant ID to numeric form for Shopify API
    const variantIdMatch = variantId.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/);
    if (!variantIdMatch) {
      return NextResponse.json(
        { error: "Invalid variant ID format" },
        { status: 400 }
      );
    }
    const numericVariantId = parseInt(variantIdMatch[1], 10);

    // Check lifetime claim limit (1 per product per user)
    // Only block if there's a COMPLETED claim - allow re-claim if previous attempt was abandoned (status="created")
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
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data: monthlyClaim } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select("id")
      .eq("user_id", userId)
      .eq("claim_month", monthStart)
      .in("status", ["completed", "fulfilled", "paid"])
      .limit(1);

    if (monthlyClaim && monthlyClaim.length > 0) {
      return NextResponse.json(
        { error: "You have already claimed a product this month" },
        { status: 400 }
      );
    }

    // Acquire pending checkout lock to prevent concurrent checkouts
    // claim_month stored as YYYY-MM-01 (first of month) for consistency with webhook
    const now = new Date();
    const claimMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { error: pendingError } = await supabaseAdmin
      .from("pending_monthly_claims")
      .insert({
        user_id: userId,
        claim_month: claimMonth,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
      });

    if (pendingError) {
      console.error("Failed to insert pending claim:", pendingError);
      return NextResponse.json(
        { error: "You have a checkout already in progress. Please complete or cancel it first." },
        { status: 400 }
      );
    }

    console.log("Inserted pending claim for user", userId);

    // Create Shopify draft order via REST Admin API
    const checkoutTime = Date.now();
    
    let checkoutUrl: string;
    let shopifyCheckoutId: string;
    
    try {
      // Get admin token from Supabase
      const { data: tokenData } = await supabaseAdmin
        .from("shopify_tokens")
        .select("access_token")
        .eq("shop", process.env.SHOPIFY_SHOP_DOMAIN)
        .single();

      if (!tokenData?.access_token) {
        console.error("No Shopify admin token found");
        return NextResponse.json(
          { error: "Shopify not configured. Please reconnect." },
          { status: 500 }
        );
      }

      const adminToken = tokenData.access_token;

      // Create draft order via REST Admin API
      const response = await fetch(
        `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/draft_orders.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": adminToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            draft_order: {
              line_items: [
                {
                  variant_id: numericVariantId,
                  quantity: 1
                }
              ],
              note_attributes: [
                { name: "nfw_user_id", value: userId },
                { name: "nfw_checkout_time", value: String(checkoutTime) }
              ]
            }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Shopify draft order error:", err);
        return NextResponse.json(
          { error: "Failed to create Shopify checkout" },
          { status: 500 }
        );
      }

      const result = await response.json();
      
      if (!result.draft_order) {
        console.error("No draft_order in response:", result);
        return NextResponse.json(
          { error: "Invalid response from Shopify" },
          { status: 500 }
        );
      }

      checkoutUrl = result.draft_order.invoice_url;
      shopifyCheckoutId = `draft_${result.draft_order.id}`;
      
      console.log(`Created Shopify draft order: ${result.draft_order.id} for user ${userId}`);
    } catch (error) {
      // Release pending checkout lock on error
      const { error: deletePendingError } = await supabaseAdmin
        .from("pending_monthly_claims")
        .delete()
        .eq("user_id", userId)
        .eq("claim_month", claimMonth);

      if (deletePendingError) {
        console.error("Failed to delete pending claim on error:", deletePendingError);
      } else {
        console.log("Deleted pending claim for user", userId, "on checkout error");
      }

      console.error("Failed to create Shopify checkout:", error);
      return NextResponse.json(
        { error: "Failed to create Shopify checkout" },
        { status: 500 }
      );
    }

    // Create claim record
    const { error: claimError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: userId,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: shopifyCheckoutId,
        status: "created",
        shipping_address: { placeholder: true },
        claimed_at: new Date().toISOString(),
      });

    if (claimError) {
      // Release pending checkout lock on claim insert failure
      const { error: deletePendingError } = await supabaseAdmin
        .from("pending_monthly_claims")
        .delete()
        .eq("user_id", userId)
        .eq("claim_month", claimMonth);

      if (deletePendingError) {
        console.error("Failed to delete pending claim on claim error:", deletePendingError);
      } else {
        console.log("Deleted pending claim for user", userId, "on claim insert error");
      }

      console.error("Error creating claim:", claimError);
      return NextResponse.json(
        { error: `Failed to save claim: ${claimError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl,
      checkoutId: shopifyCheckoutId,
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

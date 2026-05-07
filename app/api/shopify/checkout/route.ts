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

    // Check account age (minimum 48 hours before claiming) - disabled via ACCOUNT_AGE_CHECK_ENABLED env var
    const isAccountAgeCheckEnabled = process.env.ACCOUNT_AGE_CHECK_ENABLED !== "false";
    if (isAccountAgeCheckEnabled) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("joined_at")
        .eq("id", userId)
        .single();

      if (profile?.joined_at) {
        const joinedAt = new Date(profile.joined_at);
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        if (joinedAt > fortyEightHoursAgo) {
          return NextResponse.json(
            { error: "Your account must be at least 48 hours old before claiming items" },
            { status: 403 }
          );
        }
      }
    }

    if (!variantId || !productId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || "nfw-checkout.myshopify.com";

    const variantIdMatch = variantId.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/);
    if (!variantIdMatch) {
      return NextResponse.json(
        { error: "Invalid variant ID format" },
        { status: 400 }
      );
    }
    const numericVariantId = variantIdMatch[1];

    // Check lifetime claim limit (1 per product per user)
    const { data: existingClaim } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select("id")
      .eq("user_id", userId)
      .eq("shopify_product_id", productId)
      .limit(1);

    if (existingClaim && existingClaim.length > 0) {
      return NextResponse.json(
        { error: "You have already claimed this product" },
        { status: 400 }
      );
    }

    // Check monthly claim limit (1 per month per user)
    const now = new Date();
    const claimMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const { data: existingMonthlyClaim } = await supabaseAdmin
      .from("monthly_claims")
      .select("id")
      .eq("user_id", userId)
      .eq("claim_month", claimMonth)
      .limit(1);

    if (existingMonthlyClaim && existingMonthlyClaim.length > 0) {
      return NextResponse.json(
        { error: "Monthly claim limit reached. You can only claim one item per month." },
        { status: 400 }
      );
    }

    const checkoutUrl = `https://${shopDomain}/cart/${numericVariantId}:1`;

    // Create claim record
    const { error: claimError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .insert({
        user_id: userId,
        shopify_product_id: productId,
        shopify_variant_id: variantId,
        shopify_checkout_id: `checkout_${Date.now()}`,
        status: "created",
        shipping_address: { placeholder: true },
        claimed_at: new Date().toISOString(),
      });

    if (claimError) {
      console.error("Error creating claim:", claimError);
      return NextResponse.json(
        { error: `Failed to save claim: ${claimError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl,
      checkoutId: `checkout_${Date.now()}`,
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

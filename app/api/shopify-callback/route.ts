import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  if (!code || !shop) {
    return NextResponse.redirect(new URL("/admin/shopify?error=missing_params", request.url));
  }

  if (shop !== SHOPIFY_SHOP_DOMAIN) {
    return NextResponse.redirect(new URL("/admin/shopify?error=shop_mismatch", request.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_CLIENT_ID,
          client_secret: SHOPIFY_CLIENT_SECRET,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return NextResponse.redirect(new URL(`/admin/shopify?error=token_exchange_failed`, request.url));
    }

    const { access_token } = await tokenRes.json();
    if (!access_token) {
      return NextResponse.redirect(new URL("/admin/shopify?error=no_token", request.url));
    }

    // Save token to shopify_tokens table
    const supabase = await createClient();
    const { error } = await supabase
      .from("shopify_tokens")
      .upsert(
        {
          shop: shop,
          access_token: access_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "shop" }
      );

    if (error) {
      console.error("Failed to save token:", error);
      return NextResponse.redirect(new URL("/admin/shopify?error=save_failed", request.url));
    }

    return NextResponse.redirect(new URL("/admin/shopify?connected=true", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/admin/shopify?error=callback_error", request.url));
  }
}
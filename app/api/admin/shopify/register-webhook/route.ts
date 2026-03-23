import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN || "nfw-checkout.myshopify.com";
const WEBHOOK_ADDRESS = "https://nfw-mvp-4n2i.vercel.app/api/shopify/webhook";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get the Shopify access token from the database or environment
    const { data: tokenData } = await supabase
      .from("shopify_tokens")
      .select("access_token")
      .eq("shop", SHOPIFY_SHOP_DOMAIN)
      .single();

    const accessToken = tokenData?.access_token || process.env.SHOPIFY_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Shopify access token found. Please complete OAuth flow first, or set SHOPIFY_ACCESS_TOKEN env var." },
        { status: 401 }
      );
    }

    // First, let's delete any existing webhooks for orders/create
    console.log("Fetching existing webhooks...");
    const listResponse = await fetch(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Failed to list webhooks:", errorText);
      return NextResponse.json(
        { error: "Failed to list existing webhooks" },
        { status: 500 }
      );
    }

    const listData = await listResponse.json();
    const existingWebhook = listData.webhooks?.find(
      (w: any) => w.topic === "orders/create"
    );

    // Delete existing webhook if found
    if (existingWebhook) {
      console.log(`Deleting existing webhook ${existingWebhook.id}...`);
      const deleteResponse = await fetch(
        `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/webhooks/${existingWebhook.id}.json`,
        {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );

      if (!deleteResponse.ok) {
        console.error("Failed to delete webhook");
      }
    }

    // Register new webhook
    console.log("Registering new webhook...");
    const registerResponse = await fetch(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/webhooks.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: {
            topic: "orders/create",
            address: WEBHOOK_ADDRESS,
            format: "json",
          },
        }),
      }
    );

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      console.error("Failed to register webhook:", registerData);
      return NextResponse.json(
        { error: "Failed to register webhook", details: registerData },
        { status: 500 }
      );
    }

    console.log("Webhook registered successfully:", registerData.webhook);

    return NextResponse.json({
      success: true,
      webhook: registerData.webhook,
      message: "Webhook registered successfully",
    });
  } catch (error) {
    console.error("Error registering webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the Shopify access token from the database or environment
    const { data: tokenData } = await supabase
      .from("shopify_tokens")
      .select("access_token")
      .eq("shop", SHOPIFY_SHOP_DOMAIN)
      .single();

    const accessToken = tokenData?.access_token || process.env.SHOPIFY_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Shopify access token found" },
        { status: 401 }
      );
    }

    // List all webhooks
    const response = await fetch(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to list webhooks", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      webhooks: data.webhooks,
    });
  } catch (error) {
    console.error("Error listing webhooks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

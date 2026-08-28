import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;

const WEBHOOK_CALLBACK_URL = "https://www.nationalfundforwomen.org/api/shopify/webhook";

const GET_WEBHOOK_SUBSCRIPTIONS = `
  query GetWebhookSubscriptions {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          callbackUrl
        }
      }
    }
  }
`;

const DELETE_WEBHOOK_MUTATION = `
  mutation DeleteWebhookSubscription($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_WEBHOOK_MUTATION = `
  mutation CreateWebhookSubscription($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        callbackUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function registerWebhooks(accessToken: string) {
  const errors: string[] = [];

  // 1. Query existing webhooks
  const listResponse = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: GET_WEBHOOK_SUBSCRIPTIONS }),
    }
  );

  const listJson = await listResponse.json();
  const subscriptions = listJson.data?.webhookSubscriptions?.edges || [];

  console.log(`[OAuth] Found ${subscriptions.length} existing webhook subscriptions`);

  // 2. Delete existing webhooks (to avoid duplicates)
  for (const sub of subscriptions) {
    const webhookId = sub.node.id;
    console.log(`[OAuth] Deleting webhook ${webhookId} (${sub.node.topic})`);

    await fetch(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: DELETE_WEBHOOK_MUTATION,
          variables: { id: webhookId },
        }),
      }
    );
  }

  // 3. Create new webhooks with correct callbackUrl
  const webhookTopics = ["ORDERS_CREATE", "ORDERS_UPDATED"];

  for (const topic of webhookTopics) {
    console.log(`[OAuth] Creating webhook for ${topic} at ${WEBHOOK_CALLBACK_URL}`);

    const createResponse = await fetch(
      `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2026-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: CREATE_WEBHOOK_MUTATION,
          variables: {
            topic,
            webhookSubscription: {
              callbackUrl: WEBHOOK_CALLBACK_URL,
              format: "JSON",
            },
          },
        }),
      }
    );

    const createJson = await createResponse.json();

    if (createJson.errors || createJson.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
      const errorMsg =
        createJson.errors?.[0]?.message ||
        createJson.data?.webhookSubscriptionCreate?.userErrors?.[0]?.message;
      console.error(`[OAuth] Failed to create webhook for ${topic}:`, errorMsg);
      errors.push(`Failed to create ${topic}: ${errorMsg}`);
    } else {
      const newId = createJson.data?.webhookSubscriptionCreate?.webhookSubscription?.id;
      console.log(`[OAuth] Created webhook for ${topic}: ${newId}`);
    }
  }

  return errors;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");

  console.log("[OAuth] Callback received:", {
    hasCode: !!code,
    hasShop: !!shop,
    shop: shop,
    shopDomainEnv: SHOPIFY_SHOP_DOMAIN,
  });

  if (!code || !shop) {
    console.error("[OAuth] Missing code or shop param");
    return NextResponse.redirect(new URL("/admin/shopify?error=missing_params", request.url));
  }

  if (shop !== SHOPIFY_SHOP_DOMAIN) {
    console.error("[OAuth] Shop mismatch:", { received: shop, expected: SHOPIFY_SHOP_DOMAIN });
    return NextResponse.redirect(new URL("/admin/shopify?error=shop_mismatch", request.url));
  }

  try {
    // Log the token exchange attempt (sanitized - don't log actual secret)
    console.log("[OAuth] Token exchange attempt:", {
      shop: SHOPIFY_SHOP_DOMAIN,
      clientId: SHOPIFY_CLIENT_ID ? "SET" : "MISSING",
      clientSecretLength: SHOPIFY_CLIENT_SECRET?.length || 0,
      codePrefix: code ? code.substring(0, 10) + "..." : "MISSING",
    });

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
      console.error("[OAuth] Token exchange failed:", {
        status: tokenRes.status,
        error: err,
      });
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

    // Register webhooks after successful token save
    console.log("[OAuth] Registering webhooks...");
    const webhookErrors = await registerWebhooks(access_token);

    if (webhookErrors.length > 0) {
      console.error("[OAuth] Webhook registration errors:", webhookErrors);
      return NextResponse.redirect(
        new URL(`/admin/shopify?error=webhook_registration_failed&details=${encodeURIComponent(webhookErrors.join(", "))}`, request.url)
      );
    }

    console.log("[OAuth] Success! Redirecting to /admin/shopify?connected=true");
    return NextResponse.redirect(new URL("/admin/shopify?connected=true", request.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/admin/shopify?error=callback_error", request.url));
  }
}
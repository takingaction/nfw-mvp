import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEW_WEBHOOK_CALLBACK_URL = "https://www.nationalfundforwomen.org/api/shopify/webhook";
const STALE_DOMAIN_PATTERN = "nfw-mvp-4n2i.vercel.app";

const GET_WEBHOOK_SUBSCRIPTIONS = `
  query GetWebhookSubscriptions {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          callbackUrl
          format
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

const TOPIC_MAP: Record<string, string> = {
  "orders/create": "ORDERS_CREATE",
  "orders/updated": "ORDERS_UPDATED",
  "app/uninstalled": "APP_UNINSTALLED",
};

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    if (!shopDomain) {
      return NextResponse.json({ error: "Missing SHOPIFY_SHOP_DOMAIN" }, { status: 500 });
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("shopify_tokens")
      .select("access_token")
      .eq("shop", shopDomain)
      .single();

    if (tokenError || !tokenData?.access_token) {
      return NextResponse.json({ error: "No Shopify access token found. Please reconnect in admin/shopify." }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    const response = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: GET_WEBHOOK_SUBSCRIPTIONS }),
    });

    const json = await response.json();
    
    if (json.errors) {
      console.error("GraphQL errors:", json.errors);
      return NextResponse.json({ error: "Failed to query webhooks", details: json.errors }, { status: 500 });
    }

    const subscriptions = json.data?.webhookSubscriptions?.edges || [];
    
    console.log(`Found ${subscriptions.length} webhook subscriptions`);

    // Delete ALL existing webhooks (not just stale ones) - needed when verification failed
    const results = {
      deleted: [] as string[],
      created: [] as string[],
      errors: [] as string[],
    };

    // Delete all existing webhooks
    for (const sub of subscriptions) {
      const webhookId = sub.node.id;
      const topic = sub.node.topic;

      console.log(`Deleting webhook ${webhookId} (${topic})`);

      const deleteResponse = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: DELETE_WEBHOOK_MUTATION,
          variables: { id: webhookId },
        }),
      });

      const deleteJson = await deleteResponse.json();
      
      if (deleteJson.errors || deleteJson.data?.webhookSubscriptionDelete?.userErrors?.length > 0) {
        const errorMsg = deleteJson.errors?.[0]?.message || deleteJson.data?.webhookSubscriptionDelete?.userErrors?.[0]?.message;
        console.error(`Failed to delete webhook ${webhookId}:`, errorMsg);
        results.errors.push(`Failed to delete ${topic}: ${errorMsg}`);
      } else {
        console.log(`Deleted webhook ${webhookId}`);
        results.deleted.push(topic);
      }
    }

    // Create fresh webhooks with correct www URL
    const webhookTopics = ["ORDERS_CREATE", "ORDERS_UPDATED"];

    for (const topic of webhookTopics) {
      console.log(`Creating webhook for ${topic} at ${NEW_WEBHOOK_CALLBACK_URL}`);

      const createResponse = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
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
              callbackUrl: NEW_WEBHOOK_CALLBACK_URL,
              format: "JSON",
            },
          },
        }),
      });

      const createJson = await createResponse.json();
      
      if (createJson.errors || createJson.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
        const errorMsg = createJson.errors?.[0]?.message || createJson.data?.webhookSubscriptionCreate?.userErrors?.[0]?.message;
        console.error(`Failed to create webhook for ${topic}:`, errorMsg);
        results.errors.push(`Failed to create ${topic}: ${errorMsg}`);
      } else {
        const newId = createJson.data?.webhookSubscriptionCreate?.webhookSubscription?.id;
        console.log(`Created webhook for ${topic}: ${newId}`);
        results.created.push(topic);
      }
    }

    return NextResponse.json({
      message: `Deleted ${results.deleted.length} webhooks, created ${results.created.length} new webhooks`,
      results,
    });

  } catch (error) {
    console.error("Fix webhooks error:", error);
    return NextResponse.json(
      { error: "Failed to fix webhooks", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // If ?action=fix is passed, trigger the fix logic
  if (action === "fix") {
    // Delegate to POST handler logic
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    if (!shopDomain) {
      return NextResponse.json({ error: "Missing SHOPIFY_SHOP_DOMAIN" }, { status: 500 });
    }

    const { data: tokenData } = await supabaseAdmin
      .from("shopify_tokens")
      .select("access_token")
      .eq("shop", shopDomain)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({ error: "No Shopify access token found" }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Get existing webhooks
    const listResponse = await fetch(
      `https://${shopDomain}/admin/api/2026-01/graphql.json`,
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

    const results = {
      deleted: [] as string[],
      created: [] as string[],
      errors: [] as string[],
    };

    // Delete all existing webhooks
    for (const sub of subscriptions) {
      const webhookId = sub.node.id;
      const topic = sub.node.topic;
      console.log(`Deleting webhook ${webhookId} (${topic})`);

      const deleteResponse = await fetch(
        `https://${shopDomain}/admin/api/2026-01/graphql.json`,
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
      const deleteJson = await deleteResponse.json();
      if (deleteJson.errors || deleteJson.data?.webhookSubscriptionDelete?.userErrors?.length > 0) {
        const errorMsg = deleteJson.errors?.[0]?.message || deleteJson.data?.webhookSubscriptionDelete?.userErrors?.[0]?.message;
        results.errors.push(`Failed to delete ${topic}: ${errorMsg}`);
      } else {
        results.deleted.push(topic);
      }
    }

    // Create fresh webhooks with correct www URL
    const webhookTopics = ["ORDERS_CREATE", "ORDERS_UPDATED"];
    for (const topic of webhookTopics) {
      console.log(`Creating webhook for ${topic} at ${NEW_WEBHOOK_CALLBACK_URL}`);

      const createResponse = await fetch(
        `https://${shopDomain}/admin/api/2026-01/graphql.json`,
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
                callbackUrl: NEW_WEBHOOK_CALLBACK_URL,
                format: "JSON",
              },
            },
          }),
        }
      );
      const createJson = await createResponse.json();
      if (createJson.errors || createJson.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
        const errorMsg = createJson.errors?.[0]?.message || createJson.data?.webhookSubscriptionCreate?.userErrors?.[0]?.message;
        results.errors.push(`Failed to create ${topic}: ${errorMsg}`);
      } else {
        const newId = createJson.data?.webhookSubscriptionCreate?.webhookSubscription?.id;
        console.log(`Created webhook for ${topic}: ${newId}`);
        results.created.push(topic);
      }
    }

    return NextResponse.json({
      message: `Deleted ${results.deleted.length} webhooks, created ${results.created.length} new webhooks`,
      results,
    });
  }

  // Otherwise, just list current webhooks
  try {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    if (!shopDomain) {
      return NextResponse.json({ error: "Missing SHOPIFY_SHOP_DOMAIN" }, { status: 500 });
    }

    const { data: tokenData } = await supabaseAdmin
      .from("shopify_tokens")
      .select("access_token")
      .eq("shop", shopDomain)
      .single();

    if (!tokenData?.access_token) {
      return NextResponse.json({ error: "No Shopify access token found" }, { status: 400 });
    }

    const response = await fetch(`https://${shopDomain}/admin/api/2026-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": tokenData.access_token,
      },
      body: JSON.stringify({ query: GET_WEBHOOK_SUBSCRIPTIONS }),
    });

    const json = await response.json();
    const subscriptions = json.data?.webhookSubscriptions?.edges || [];

    const webhookList = subscriptions.map((sub: { node: { id: string; topic: string; callbackUrl: string } }) => ({
      id: sub.node.id,
      topic: sub.node.topic,
      callbackUrl: sub.node.callbackUrl,
      isStale: sub.node.callbackUrl.includes(STALE_DOMAIN_PATTERN),
    }));

    return NextResponse.json({
      shop: shopDomain,
      webhooks: webhookList,
      staleCount: webhookList.filter((w: { isStale: boolean }) => w.isStale).length,
    });

  } catch (error) {
    console.error("List webhooks error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
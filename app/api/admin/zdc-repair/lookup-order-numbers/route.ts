import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Get Shopify order by checkout ID
async function getShopifyOrderByCheckout(checkoutId: string): Promise<{ name: string; email: string | null; id: string } | null> {
  const storeDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!token || !storeDomain) {
    console.error("[lookup-order-numbers] Missing Shopify credentials");
    return null;
  }

  try {
    // Extract numeric checkout ID from gid://shopify/Checkout/123456
    const numericId = checkoutId.split('/').pop();

    const response = await fetch(
      `https://${storeDomain}/admin/api/2026-01/orders.json?checkout_id=${numericId}`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[lookup-order-numbers] Shopify API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const orders = data.orders;

    if (!orders || orders.length === 0) {
      return null;
    }

    // Return the first matching order
    return {
      id: orders[0].id,
      name: orders[0].name, // This is the order number like "#1001"
      email: orders[0].email,
    };
  } catch (error) {
    console.error("[lookup-order-numbers] Fetch error:", error);
    return null;
  }
}

// Wrong user IDs from the breach analysis
const WRONG_USER_IDS = [
  '0101e031-4ef9-4f39-9a26-d161bf59ee78', // Melissa Suter
  'db997c24-6643-4d67-9648-005334a5732e', // Bernadette Robertson
  '6b54692c-c6ef-444b-97e0-9345614234e5', // Jamey Zimmer
  'b41fd56f-7ee8-450f-aa0d-b181a279110a', // Ashley Flores
  '14e95038-7b12-4be6-8cab-899f388a4daf', // Lawanda Rogness
  '24a801f0-4dfe-42d6-851d-4e4bb6e4480d', // Shakhnoza Bobokhonova
  '44f33f86-39aa-4fd2-944e-c69b27f54644', // Alexus Potter
  '4347fa93-fb99-4078-a738-c68a93319ac0', // Monique Graves
  'edb0c82a-d5ab-4cec-b33f-2c20d6d00861', // Juliette Dixon
  'e3d7fe04-debd-4ee2-8c13-1a30bc7c5aa8', // Elizabeth Grove
  '4909599d-ab7e-4409-9ff9-2c4b6c533d3d', // Nicole Tran
  'e777dd9b-28e7-402f-8ff9-a8de0c2f6c2b', // Hope Coleman
  '4ef4c5a9-f70e-468c-80d8-acb03935b5f1', // Kelsey Driscoll
  'f55f140b-b560-42bc-9908-95fbbbbb5a1f', // Tisha Scherr
  '42e682d1-451a-437a-82f6-cf9f85272027', // Kayla Bennett
  '02912e65-f15a-4203-b42a-44a587d01def', // Varina Winder
  'f472d855-6527-41e7-81d0-5f8350d7d907', // Heidi Carey
  '44326c42-f517-427e-aed5-1e621d1126e0', // Starla Gatson
  '9518218e-149a-4cd3-81d5-19f13581354e', // Angela Oh
  '069293ea-8ff2-49b4-abe4-2894d364c0f9', // Atalie Pellerito
  'cdd30087-d348-4a7c-8b09-b593ca204714', // Naiya Saleem
  '27e2e845-4a72-4b81-a9fd-1bc67c6bc177', // De'Ja Irvin
  'fa62e71d-9b24-4ef3-80a5-bb104b7c7b74', // Dara Dickson
  'c0a80f7a-2c1c-4ebf-83ce-83db06d1699e', // Jolie Kleinhenz
];

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin, email")
      .eq("id", user.id)
      .single();

    const allowedEmails = ["kelsey@nationalfundforwomen.org", "ron@myherodesign.com"];
    if (!profile?.is_admin && !allowedEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[lookup-order-numbers] Fetching claims for wrong users...");

    // Get all completed claims for wrong users
    const { data: claims, error } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select(`
        id,
        user_id,
        shopify_checkout_id,
        shopify_order_id,
        shopify_product_id,
        status,
        order_status_url,
        claimed_at,
        profiles:user_id (id, full_name, email)
      `)
      .in("user_id", WRONG_USER_IDS)
      .eq("status", "completed");

    if (error) {
      console.error("[lookup-order-numbers] Error fetching claims:", error);
      return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
    }

    console.log("[lookup-order-numbers] Found", claims?.length || 0, "completed claims for wrong users");

    const results = [];
    let shopifyErrorCount = 0;

    // Process each claim and look up order number
    for (const claim of claims || []) {
      const profile = claim.profiles as any;

      // Try to get order number from shopify_order_id first
      let orderNumber = null;
      let shopifyOrderId = claim.shopify_order_id;
      let shopifyEmail = null;

      if (shopifyOrderId) {
        // We have a shopify_order_id - use it directly
        const orderInfo = await getShopifyOrderByCheckout(claim.shopify_checkout_id || shopifyOrderId);
        if (orderInfo) {
          orderNumber = orderInfo.name;
          shopifyEmail = orderInfo.email;
        } else {
          // Fallback: extract number from gid if direct lookup fails
          orderNumber = shopifyOrderId.split('/').pop() || shopifyOrderId;
        }
      } else if (claim.shopify_checkout_id) {
        // No shopify_order_id, try checkout ID
        const orderInfo = await getShopifyOrderByCheckout(claim.shopify_checkout_id);
        if (orderInfo) {
          orderNumber = orderInfo.name;
          shopifyOrderId = `gid://shopify/Order/${orderInfo.id}`;
          shopifyEmail = orderInfo.email;
        } else {
          shopifyErrorCount++;
        }
      }

      results.push({
        claim_id: claim.id,
        user_id: claim.user_id,
        nfw_email: profile?.email || "Unknown",
        nfw_name: profile?.full_name || "Unknown",
        status: claim.status,
        shopify_checkout_id: claim.shopify_checkout_id,
        shopify_order_id: shopifyOrderId,
        shopify_order_number: orderNumber,
        shopify_email: shopifyEmail,
        shopify_product_id: claim.shopify_product_id,
        order_status_url: claim.order_status_url,
        claimed_at: claim.claimed_at,
      });
    }

    console.log("[lookup-order-numbers] Shopify lookup errors:", shopifyErrorCount);

    return NextResponse.json({
      total_claims: results.length,
      shopify_lookup_errors: shopifyErrorCount,
      results,
    });

  } catch (error) {
    console.error("[lookup-order-numbers] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

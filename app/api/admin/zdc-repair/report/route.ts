import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getShopifyOrder } from "@/lib/shopify";
import { writeFileSync } from "fs";
import { join } from "path";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ClaimWithProfile {
  id: string;
  user_id: string;
  order_status_url: string | null;
  shopify_order_id: string | null;
  shopify_product_id: string | null;
  status: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ShopifyOrderInfo {
  id: string;
  email: string | null;
  name: string | null;
  customer: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  line_items: Array<{
    title: string;
    quantity: number;
  }>;
}

async function getShopifyOrderFull(orderGid: string): Promise<ShopifyOrderInfo | null> {
  const numericId = orderGid.split('/').pop();
  const storeDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = await getShopifyAccessTokenInternal();

  if (!token || !storeDomain) {
    console.error("[zdc-repair-report] Missing Shopify credentials");
    return null;
  }

  try {
    // Use Admin REST API to get full order details
    const response = await fetch(
      `https://${storeDomain}/admin/api/2026-01/orders/${numericId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[zdc-repair-report] Shopify API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const order = data.order;

    return {
      id: order.id,
      email: order.email,
      name: order.name,
      customer: order.customer ? {
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        email: order.customer.email,
      } : null,
      line_items: order.line_items?.map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
      })) || [],
    };
  } catch (error) {
    console.error("[zdc-repair-report] Fetch error:", error);
    return null;
  }
}

async function getShopifyAccessTokenInternal(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("shopify_tokens")
    .select("access_token")
    .eq("shop", process.env.SHOPIFY_SHOP_DOMAIN)
    .single();
  
  if (error || !data) {
    return process.env.SHOPIFY_ACCESS_TOKEN || null;
  }
  return data.access_token as string;
}

async function getProductName(productId: string): Promise<string | null> {
  if (!productId) return null;
  
  const { data, error } = await supabaseAdmin
    .from("shopify_product_mappings")
    .select("title")
    .eq("shopify_product_id", productId)
    .single();
  
  if (error || !data) return null;
  return data.title as string;
}

async function getAllClaimsWithUrls() {
  const { data, error } = await supabaseAdmin
    .from("zero_dollar_claims")
    .select(`
      id,
      user_id,
      order_status_url,
      shopify_order_id,
      shopify_product_id,
      status,
      profiles:user_id (id, full_name, email)
    `)
    .not("order_status_url", "is", null)
    .in("status", ["completed", "fulfilled", "paid", "delivered"]);

  if (error) throw error;
  return data as unknown as ClaimWithProfile[] | null;
}

function findSharedUrls(claims: ClaimWithProfile[]) {
  const urlToClaims = new Map<string, ClaimWithProfile[]>();

  for (const claim of claims) {
    if (!claim.order_status_url) continue;
    const url = claim.order_status_url;
    
    if (!urlToClaims.has(url)) {
      urlToClaims.set(url, []);
    }
    urlToClaims.get(url)!.push(claim);
  }

  const shared = [];
  for (const [url, claimList] of urlToClaims) {
    const uniqueUsers = new Set(claimList.map(c => c.user_id));
    if (uniqueUsers.size > 1) {
      shared.push({ url, claims: claimList });
    }
  }

  return shared;
}

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

    console.log("[zdc-repair-report] Starting report generation...");
    console.log("[zdc-repair-report] User:", user.email);

    // Get all claims with URLs
    const allClaims = await getAllClaimsWithUrls();
    
    if (!allClaims || allClaims.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No claims with URLs found",
        report: null
      });
    }

    // Find URLs shared by multiple users
    const sharedUrls = findSharedUrls(allClaims);
    
    if (sharedUrls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No shared URLs found",
        report: null
      });
    }

    console.log("[zdc-repair-report] Found", sharedUrls.length, "shared URLs");

    // Report data structures
    const compromisedOrders: Array<{
      shopify_order_id: string;
      shopify_email: string;
      shopify_customer_name: string | null;
      nfw_profile_match: string | null;
      nfw_profile_id: string | null;
      product_name: string | null;
      product_id: string | null;
      users_with_wrong_link: Array<{
        name: string;
        email: string;
        user_id: string;
      }>;
    }> = [];

    const usersWithWrongLinks: Array<{
      name: string;
      email: string;
      user_id: string;
      wrong_order_email: string;
      wrong_order_id: string;
      wrong_order_shopify_customer_name: string | null;
    }> = [];

    const manualReviewNeeded: Array<{
      shopify_order_id: string;
      shopify_email: string;
      nfw_profile_match: string | null;
      users_with_this_link: Array<{
        name: string;
        email: string;
        user_id: string;
      }>;
      reason: string;
    }> = [];

    let totalCorrectMatches = 0;
    let totalWrongLinks = 0;

    // Process each shared URL
    for (const shared of sharedUrls) {
      console.log("[zdc-repair-report] Processing:", shared.url.substring(0, 40) + "...");

      const shopifyOrderId = shared.claims[0]?.shopify_order_id;
      const productId = shared.claims[0]?.shopify_product_id;

      if (!shopifyOrderId) {
        console.log("[zdc-repair-report] No shopify_order_id - skipping");
        continue;
      }

      // Query Shopify for full order details
      const shopifyOrder = await getShopifyOrderFull(shopifyOrderId);
      
      let shopifyEmail: string | null = null;
      let shopifyCustomerName: string | null = null;
      
      if (shopifyOrder) {
        shopifyEmail = shopifyOrder.customer?.email || shopifyOrder.email;
        if (shopifyOrder.customer) {
          const first = shopifyOrder.customer.first_name || '';
          const last = shopifyOrder.customer.last_name || '';
          shopifyCustomerName = [first, last].filter(Boolean).join(' ') || null;
        }
        console.log("[zdc-repair-report] Shopify customer:", shopifyCustomerName, shopifyEmail);
      }

      // Match to NFW profile
      let matchedProfile: { id: string; email: string; full_name: string | null } | null = null;
      
      if (shopifyEmail) {
        const { data: profileMatch } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .ilike("email", shopifyEmail)
          .single();
        
        if (profileMatch) {
          matchedProfile = profileMatch as { id: string; email: string; full_name: string | null };
          console.log("[zdc-repair-report] Matched NFW profile:", matchedProfile.full_name);
        }
      }

      // Get product name
      const productName = await getProductName(productId || '');

      if (matchedProfile) {
        // This order has a matched user - the correct owner
        const wrongLinkUsers = shared.claims
          .filter(c => c.user_id !== matchedProfile!.id)
          .map(c => ({
            name: c.profiles?.full_name || "Unknown",
            email: c.profiles?.email || "Unknown",
            user_id: c.user_id,
          }));

        compromisedOrders.push({
          shopify_order_id: shopifyOrderId,
          shopify_email: shopifyEmail || "Unknown",
          shopify_customer_name: shopifyCustomerName,
          nfw_profile_match: matchedProfile.full_name 
            ? `${matchedProfile.full_name} (${matchedProfile.email})`
            : matchedProfile.email,
          nfw_profile_id: matchedProfile.id,
          product_name: productName,
          product_id: productId,
          users_with_wrong_link: wrongLinkUsers,
        });

        // Add to wrong links list
        for (const wrongUser of wrongLinkUsers) {
          usersWithWrongLinks.push({
            name: wrongUser.name,
            email: wrongUser.email,
            user_id: wrongUser.user_id,
            wrong_order_email: shopifyEmail || "Unknown",
            wrong_order_id: shopifyOrderId,
            wrong_order_shopify_customer_name: shopifyCustomerName,
          });
          totalWrongLinks++;
        }

        totalCorrectMatches++;
      } else {
        // No NFW profile match - needs manual review
        manualReviewNeeded.push({
          shopify_order_id: shopifyOrderId,
          shopify_email: shopifyEmail || "Unknown",
          nfw_profile_match: null,
          users_with_this_link: shared.claims.map(c => ({
            name: c.profiles?.full_name || "Unknown",
            email: c.profiles?.email || "Unknown",
            user_id: c.user_id,
          })),
          reason: shopifyEmail 
            ? `Shopify email "${shopifyEmail}" does not match any NFW profile`
            : "No Shopify customer email found",
        });

        // Add all users to wrong links (none of them should have this link)
        for (const wrongUser of shared.claims) {
          usersWithWrongLinks.push({
            name: wrongUser.profiles?.full_name || "Unknown",
            email: wrongUser.profiles?.email || "Unknown",
            user_id: wrongUser.user_id,
            wrong_order_email: shopifyEmail || "Unknown",
            wrong_order_id: shopifyOrderId,
            wrong_order_shopify_customer_name: shopifyCustomerName,
          });
          totalWrongLinks++;
        }
      }
    }

    // Build report
    const report = {
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      
      summary: {
        total_compromised_orders: compromisedOrders.length,
        total_users_with_wrong_links: usersWithWrongLinks.length,
        total_manual_review: manualReviewNeeded.length,
      },

      compromised_orders: compromisedOrders,
      
      users_with_wrong_links: usersWithWrongLinks,
      
      manual_review_needed: manualReviewNeeded,
    };

    // Save to file
    const fileName = `Aug-4-2026-ZDC-report.json`;
    const filePath = join(process.cwd(), fileName);
    writeFileSync(filePath, JSON.stringify(report, null, 2));
    
    console.log("[zdc-repair-report] ============================================");
    console.log("[zdc-repair-report] REPORT GENERATED");
    console.log("[zdc-repair-report] File:", filePath);
    console.log("[zdc-repair-report] Compromised orders:", compromisedOrders.length);
    console.log("[zdc-repair-report] Users with wrong links:", usersWithWrongLinks.length);
    console.log("[zdc-repair-report] Manual review needed:", manualReviewNeeded.length);
    console.log("[zdc-repair-report] ============================================");

    return NextResponse.json({
      success: true,
      message: `Report generated successfully`,
      file_name: fileName,
      summary: report.summary,
      compromised_orders_preview: compromisedOrders.slice(0, 3),
      users_with_wrong_links_preview: usersWithWrongLinks.slice(0, 5),
      manual_review_preview: manualReviewNeeded.slice(0, 3),
    });
  } catch (err: unknown) {
    console.error("[zdc-repair-report] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getShopifyOrder } from "@/lib/shopify";

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
  claimed_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface RepairResult {
  url_hash: string;
  shopify_order_id: string;
  claims: {
    user_id: string;
    name: string;
    email: string;
    was_correct: boolean;
    cleared: boolean;
  }[];
  shopify_email: string | null;
  matched_profile_email: string | null;
  status: "repaired" | "partial" | "failed";
  error?: string;
}

// Get all claims with their profiles
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
      claimed_at,
      profiles:user_id (id, full_name, email)
    `)
    .not("order_status_url", "is", null)
    .in("status", ["completed", "fulfilled", "paid", "delivered"]);

  if (error) throw error;
  return data as unknown as ClaimWithProfile[] | null;
}

// Group claims by order_status_url and find ones shared by multiple users
function findSharedUrls(claims: ClaimWithProfile[]) {
  const urlToUsers = new Map<string, Set<string>>();
  const urlToClaims = new Map<string, ClaimWithProfile[]>();

  for (const claim of claims) {
    if (!claim.order_status_url) continue;
    const url = claim.order_status_url;
    
    if (!urlToUsers.has(url)) {
      urlToUsers.set(url, new Set());
      urlToClaims.set(url, []);
    }
    urlToUsers.get(url)!.add(claim.user_id);
    urlToClaims.get(url)!.push(claim);
  }

  // Return only URLs shared by multiple users
  const shared = [];
  for (const [url, users] of urlToUsers) {
    if (users.size > 1) {
      shared.push({
        url,
        user_count: users.size,
        claims: urlToClaims.get(url)!
      });
    }
  }

  return shared;
}

export async function POST(_request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    console.log("[zdc-repair] Starting ZDC repair...");
    console.log("[zdc-repair] User:", user.email);

    // Step 1: Get all claims with URLs
    const allClaims = await getAllClaimsWithUrls();
    
    if (!allClaims || allClaims.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No claims with URLs found",
        repaired: 0,
        cleared: 0,
        results: []
      });
    }

    console.log("[zdc-repair] Total claims with URLs:", allClaims.length);

    // Step 2: Find URLs shared by multiple users
    const sharedUrls = findSharedUrls(allClaims);
    
    if (sharedUrls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No shared URLs found - nothing to repair",
        repaired: 0,
        cleared: 0,
        results: []
      });
    }

    console.log("[zdc-repair] Found", sharedUrls.length, "URLs shared by multiple users");

    const results: RepairResult[] = [];
    let totalRepaired = 0;
    let totalCleared = 0;

    // Step 3: Process each shared URL
    for (const shared of sharedUrls) {
      console.log("[zdc-repair] ============================================");
      console.log("[zdc-repair] Processing URL hash:", shared.url.substring(0, 20) + "...");
      console.log("[zdc-repair] Shared by", shared.user_count, "users,", shared.claims.length, "claims");

      const shopifyOrderId = shared.claims[0]?.shopify_order_id;
      const claimResults: RepairResult["claims"] = [];

      if (!shopifyOrderId) {
        console.log("[zdc-repair] No shopify_order_id - clearing all but first as best effort");
        
        // Clear all but the first claim's URL as best effort
        for (let i = 0; i < shared.claims.length; i++) {
          const claim = shared.claims[i];
          
          if (i > 0) {
            await supabaseAdmin
              .from("zero_dollar_claims")
              .update({ order_status_url: null, shopify_order_id: null })
              .eq("id", claim.id);
            
            claimResults.push({
              user_id: claim.user_id,
              name: claim.profiles?.full_name || "Unknown",
              email: claim.profiles?.email || "Unknown",
              was_correct: false,
              cleared: true
            });
            totalCleared++;
          } else {
            claimResults.push({
              user_id: claim.user_id,
              name: claim.profiles?.full_name || "Unknown",
              email: claim.profiles?.email || "Unknown",
              was_correct: true,
              cleared: false
            });
            totalRepaired++;
          }
        }

        results.push({
          url_hash: shared.url,
          shopify_order_id: "none",
          claims: claimResults,
          shopify_email: null,
          matched_profile_email: null,
          status: "partial",
          error: "No shopify_order_id - cleared duplicates as best effort"
        });
        continue;
      }

      // Step 4: Query Shopify to get the actual customer email
      console.log("[zdc-repair] Querying Shopify for order:", shopifyOrderId);
      const shopifyOrder = await getShopifyOrder(shopifyOrderId);
      
      let shopifyEmail: string | null = null;
      if (shopifyOrder) {
        shopifyEmail = shopifyOrder.customer?.email || shopifyOrder.email;
        console.log("[zdc-repair] Shopify customer email:", shopifyEmail);
      } else {
        console.log("[zdc-repair] Could not fetch order from Shopify");
      }

      // Step 5: Match to NFW profile by email
      let correctUserId: string | null = null;
      let matchedProfileEmail: string | null = null;

      if (shopifyEmail) {
        const { data: matchedProfile } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .ilike("email", shopifyEmail)
          .single();
        
        if (matchedProfile) {
          matchedProfileEmail = matchedProfile.email;
          correctUserId = matchedProfile.id;
          console.log("[zdc-repair] Matched to NFW profile:", matchedProfileEmail);
        } else {
          console.log("[zdc-repair] No NFW profile found for:", shopifyEmail);
        }
      }

      // Step 6: Keep URL on correct user's claim, clear from others
      for (const claim of shared.claims) {
        const isCorrectUser = correctUserId && claim.user_id === correctUserId;
        
        if (isCorrectUser) {
          console.log("[zdc-repair] KEEPING URL for:", claim.profiles?.email);
          claimResults.push({
            user_id: claim.user_id,
            name: claim.profiles?.full_name || "Unknown",
            email: claim.profiles?.email || "Unknown",
            was_correct: true,
            cleared: false
          });
          totalRepaired++;
        } else {
          console.log("[zdc-repair] CLEARING URL from:", claim.profiles?.email);
          await supabaseAdmin
            .from("zero_dollar_claims")
            .update({ order_status_url: null, shopify_order_id: null })
            .eq("id", claim.id);
          
          claimResults.push({
            user_id: claim.user_id,
            name: claim.profiles?.full_name || "Unknown",
            email: claim.profiles?.email || "Unknown",
            was_correct: false,
            cleared: true
          });
          totalCleared++;
        }
      }

      results.push({
        url_hash: shared.url,
        shopify_order_id: shopifyOrderId,
        claims: claimResults,
        shopify_email: shopifyEmail,
        matched_profile_email: matchedProfileEmail,
        status: correctUserId ? "repaired" : "partial"
      });
    }

    console.log("[zdc-repair] ============================================");
    console.log("[zdc-repair] REPAIR COMPLETE");
    console.log("[zdc-repair] Total URLs preserved (correct user):", totalRepaired);
    console.log("[zdc-repair] Total URLs cleared (wrong user):", totalCleared);
    console.log("[zdc-repair] ============================================");

    return NextResponse.json({
      success: true,
      message: `Repair complete. ${totalRepaired} correct assignments preserved, ${totalCleared} wrong assignments cleared.`,
      repaired: totalRepaired,
      cleared: totalCleared,
      results
    });
  } catch (err: unknown) {
    console.error("[zdc-repair] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint to preview what would be repaired without making changes
export async function GET() {
  try {
    const allClaims = await getAllClaimsWithUrls();
    
    if (!allClaims || allClaims.length === 0) {
      return NextResponse.json({ urls_to_fix: 0, details: [] });
    }

    const sharedUrls = findSharedUrls(allClaims);

    const details = sharedUrls.map(shared => ({
      url_hash: shared.url,
      user_count: shared.user_count,
      claims: shared.claims.map(c => ({
        user_id: c.user_id,
        name: c.profiles?.full_name,
        email: c.profiles?.email,
        shopify_order_id: c.shopify_order_id
      }))
    }));

    return NextResponse.json({
      urls_to_fix: sharedUrls.length,
      details
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
  status: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface PreviewClaim {
  user_id: string;
  name: string;
  email: string;
  action: "KEEP" | "CLEAR" | "UNKNOWN";
  reason: string;
}

interface PreviewResult {
  url_hash: string;
  shopify_order_id: string;
  shopify_email: string | null;
  matched_nfw_profile: string | null;
  claims: PreviewClaim[];
  status: "repaired" | "no_match" | "error";
  error?: string;
}

async function getAllClaimsWithUrls() {
  const { data, error } = await supabaseAdmin
    .from("zero_dollar_claims")
    .select(`
      id,
      user_id,
      order_status_url,
      shopify_order_id,
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

    console.log("[zdc-repair-preview] Starting preview...");
    console.log("[zdc-repair-preview] User:", user.email);

    // Get all claims with URLs
    const allClaims = await getAllClaimsWithUrls();
    
    if (!allClaims || allClaims.length === 0) {
      return NextResponse.json({
        urls_to_fix: 0,
        preview: [],
        summary: { total_urls: 0, will_keep: 0, will_clear: 0, shopify_unreachable: 0, no_match_in_nfw: 0 }
      });
    }

    // Find URLs shared by multiple users
    const sharedUrls = findSharedUrls(allClaims);
    
    if (sharedUrls.length === 0) {
      return NextResponse.json({
        urls_to_fix: 0,
        preview: [],
        summary: { total_urls: 0, will_keep: 0, will_clear: 0, shopify_unreachable: 0, no_match_in_nfw: 0 }
      });
    }

    console.log("[zdc-repair-preview] Found", sharedUrls.length, "shared URLs to preview");

    const preview: PreviewResult[] = [];
    let totalKeep = 0;
    let totalClear = 0;
    let shopifyUnreachable = 0;
    let noMatchInNfw = 0;

    // Process each shared URL
    for (const shared of sharedUrls) {
      console.log("[zdc-repair-preview] ============================================");
      console.log("[zdc-repair-preview] Previewing URL:", shared.url.substring(0, 30) + "...");

      const shopifyOrderId = shared.claims[0]?.shopify_order_id;
      const claimResults: PreviewClaim[] = [];

      if (!shopifyOrderId) {
        console.log("[zdc-repair-preview] No shopify_order_id - using first claim as best guess");
        
        // Best effort: keep first claim, clear others
        for (let i = 0; i < shared.claims.length; i++) {
          const claim = shared.claims[i];
          claimResults.push({
            user_id: claim.user_id,
            name: claim.profiles?.full_name || "Unknown",
            email: claim.profiles?.email || "Unknown",
            action: i === 0 ? "KEEP" : "CLEAR",
            reason: i === 0 ? "First claim (no shopify_order_id)" : "Not the first claim (no shopify_order_id)"
          });
          if (i === 0) totalKeep++; else totalClear++;
        }

        preview.push({
          url_hash: shared.url,
          shopify_order_id: "none",
          shopify_email: null,
          matched_nfw_profile: null,
          claims: claimResults,
          status: "error",
          error: "No shopify_order_id - using first claim as best guess"
        });
        continue;
      }

      // Query Shopify to get the actual customer email
      console.log("[zdc-repair-preview] Querying Shopify for order:", shopifyOrderId);
      const shopifyOrder = await getShopifyOrder(shopifyOrderId);
      
      let shopifyEmail: string | null = null;
      if (shopifyOrder) {
        shopifyEmail = shopifyOrder.customer?.email || shopifyOrder.email;
        console.log("[zdc-repair-preview] Shopify customer email:", shopifyEmail);
      } else {
        console.log("[zdc-repair-preview] Could not fetch order from Shopify");
        shopifyUnreachable++;
      }

      // Match to NFW profile by email
      let matchedProfileInfo: string | null = null;
      let correctUserId: string | null = null;

      if (shopifyEmail) {
        const { data: matchedProfile } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .ilike("email", shopifyEmail)
          .single();
        
        if (matchedProfile) {
          matchedProfileInfo = `${matchedProfile.full_name || "Unknown"} (${matchedProfile.email})`;
          correctUserId = matchedProfile.id;
          console.log("[zdc-repair-preview] Matched to NFW profile:", matchedProfileInfo);
        } else {
          console.log("[zdc-repair-preview] No NFW profile found for:", shopifyEmail);
          noMatchInNfw++;
        }
      }

      // Determine which users get KEEP vs CLEAR
      for (const claim of shared.claims) {
        const isCorrectUser = correctUserId && claim.user_id === correctUserId;
        
        if (isCorrectUser) {
          console.log("[zdc-repair-preview] KEEP:", claim.profiles?.email);
          claimResults.push({
            user_id: claim.user_id,
            name: claim.profiles?.full_name || "Unknown",
            email: claim.profiles?.email || "Unknown",
            action: "KEEP",
            reason: shopifyEmail ? `Matched to Shopify order email: ${shopifyEmail}` : "Could not query Shopify"
          });
          totalKeep++;
        } else {
          console.log("[zdc-repair-preview] CLEAR:", claim.profiles?.email);
          claimResults.push({
            user_id: claim.user_id,
            name: claim.profiles?.full_name || "Unknown",
            email: claim.profiles?.email || "Unknown",
            action: "CLEAR",
            reason: correctUserId 
              ? `Email ${claim.profiles?.email} does not match Shopify order email: ${shopifyEmail}` 
              : `Could not match Shopify email ${shopifyEmail} to any NFW profile`
          });
          totalClear++;
        }
      }

      preview.push({
        url_hash: shared.url,
        shopify_order_id: shopifyOrderId,
        shopify_email: shopifyEmail,
        matched_nfw_profile: matchedProfileInfo,
        claims: claimResults,
        status: correctUserId ? "repaired" : "no_match"
      });
    }

    console.log("[zdc-repair-preview] ============================================");
    console.log("[zdc-repair-preview] PREVIEW COMPLETE");
    console.log("[zdc-repair-preview] Total URLs:", sharedUrls.length);
    console.log("[zdc-repair-preview] Will KEEP:", totalKeep);
    console.log("[zdc-repair-preview] Will CLEAR:", totalClear);
    console.log("[zdc-repair-preview] Shopify unreachable:", shopifyUnreachable);
    console.log("[zdc-repair-preview] No match in NFW:", noMatchInNfw);
    console.log("[zdc-repair-preview] ============================================");

    return NextResponse.json({
      urls_to_fix: sharedUrls.length,
      preview,
      summary: {
        total_urls: sharedUrls.length,
        will_keep: totalKeep,
        will_clear: totalClear,
        shopify_unreachable: shopifyUnreachable,
        no_match_in_nfw: noMatchInNfw
      }
    });
  } catch (err: unknown) {
    console.error("[zdc-repair-preview] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

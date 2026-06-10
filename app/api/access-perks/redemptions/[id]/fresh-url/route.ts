import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Simple in-memory cache with 5-minute TTL
interface CacheEntry {
  url: string;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const freshUrlCache: Map<string, CacheEntry> = new Map();

function getCachedUrl(key: string): string | null {
  const cached = freshUrlCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.url;
  }
  if (cached) {
    freshUrlCache.delete(key);
  }
  return null;
}

function setCachedUrl(key: string, url: string): void {
  freshUrlCache.set(key, { url, timestamp: Date.now() });
}

export async function GET(request: Request, { params }: RouteParams) {
  console.log("[fresh-url] API called with params:", params);
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`fresh-url:${ip}`, 10, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from("offer_redemptions")
      .select("id, offer_key, usage_redeem_key, redeem_type, status, redemption_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (redemptionError || !redemption) {
      return NextResponse.json(
        { error: "Redemption not found" },
        { status: 404 },
      );
    }

    // Check cache
    const cacheKey = `${id}`;
    const cachedUrl = getCachedUrl(cacheKey);
    if (cachedUrl) {
      console.log("[fresh-url] Returning cached URL");
      return NextResponse.json({ url: cachedUrl, cached: true });
    }

    // If no usage_redeem_key, return error
    if (!redemption.usage_redeem_key) {
      console.log("[fresh-url] No usage_redeem_key, returning 410");
      return NextResponse.json(
        { error: "Link expired or offer no longer available" },
        { status: 410 },
      );
    }

    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    // Fetch fresh URL from Access Perks
    const redeemApiUrl = process.env.ACCESS_REDEEM_API_URL || "https://redeem.adcrws.com";
    const apiUrl = `${redeemApiUrl}/v1/redeem/${redemption.offer_key}/${redemption.redeem_type}?access_token=${process.env.ACCESS_REDEEM_TOKEN}&member_key=${memberKey}&usage_redeem_key=${redemption.usage_redeem_key}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const responseText = await response.text();
    const responseStatus = response.status;

    console.log("[fresh-url] Access Perks API response status:", responseStatus, "body preview:", responseText.substring(0, 100));

    // Check for Access Denied or other errors
    if (!response.ok) {
      let errorMessage = "Link expired or offer no longer available";

      // Check if it's an Access Denied error (S3 signed URL expired)
      if (responseText.includes("AccessDenied") || responseText.includes("<Error>")) {
        errorMessage = "Link expired or offer no longer available";
      }

      // Try to parse JSON error from Access Perks
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Not JSON, use default message
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 410 },
      );
    }

    let redemptionData;
    try {
      redemptionData = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Invalid response from server" },
        { status: 500 },
      );
    }

    // Extract fresh URL from response
    const freshUrl =
      redemptionData.details?.link ||
      redemptionData.url ||
      redemptionData.redemption_url ||
      redemptionData.link ||
      null;

    console.log("[fresh-url] Extracted freshUrl:", freshUrl, "from redemptionData:", JSON.stringify(redemptionData).substring(0, 200));

    if (!freshUrl) {
      console.log("[fresh-url] No fresh URL, returning 410 error");
      return NextResponse.json(
        { error: "Link expired or offer no longer available" },
        { status: 410 },
      );
    }

    // Cache the fresh URL
    setCachedUrl(cacheKey, freshUrl);
    console.log("[fresh-url] Returning success with URL");

    return NextResponse.json({ url: freshUrl, cached: false });
  } catch (err) {
    console.error("[fresh-url] Unexpected error:", err);
    return NextResponse.json(
      { error: "Link expired or offer no longer available" },
      { status: 500 },
    );
  }
}
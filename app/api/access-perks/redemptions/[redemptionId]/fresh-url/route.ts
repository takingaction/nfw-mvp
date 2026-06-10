import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{
    redemptionId: string;
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
  // Clean up expired entry
  if (cached) {
    freshUrlCache.delete(key);
  }
  return null;
}

function setCachedUrl(key: string, url: string): void {
  freshUrlCache.set(key, { url, timestamp: Date.now() });
}

export async function GET(request: Request, { params }: RouteParams) {
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
    const { redemptionId } = resolvedParams;

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
      .select("id, offer_key, usage_redeem_key, redeem_type, status")
      .eq("id", redemptionId)
      .eq("user_id", user.id)
      .single();

    if (redemptionError || !redemption) {
      return NextResponse.json(
        { error: "Redemption not found" },
        { status: 404 },
      );
    }

    // Check cache
    const cacheKey = `${redemptionId}`;
    const cachedUrl = getCachedUrl(cacheKey);
    if (cachedUrl) {
      return NextResponse.json({ url: cachedUrl, cached: true });
    }

    // If no usage_redeem_key, return error
    if (!redemption.usage_redeem_key) {
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

    if (!response.ok) {
      return NextResponse.json(
        { error: "Link expired or offer no longer available" },
        { status: 410 },
      );
    }

    const redemptionData = await response.json();

    // Extract fresh URL from response
    const freshUrl =
      redemptionData.details?.link ||
      redemptionData.url ||
      redemptionData.redemption_url ||
      redemptionData.link ||
      null;

    if (!freshUrl) {
      return NextResponse.json(
        { error: "Link expired or offer no longer available" },
        { status: 410 },
      );
    }

    // Cache the fresh URL
    setCachedUrl(cacheKey, freshUrl);

    return NextResponse.json({ url: freshUrl, cached: false });
  } catch {
    return NextResponse.json(
      { error: "Link expired or offer no longer available" },
      { status: 500 },
    );
  }
}
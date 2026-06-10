import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const freshUrlCache: Map<string, { url: string; timestamp: number }> = new Map();

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
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`fresh-url:${ip}`, 10, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: redemption, error: redemptionError } = await supabase
      .from("offer_redemptions")
      .select("id, offer_key, usage_redeem_key, redeem_type, status, redemption_url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (redemptionError || !redemption) {
      return NextResponse.json({ error: "Redemption not found" }, { status: 404 });
    }

    const cacheKey = `${id}`;
    const cachedUrl = getCachedUrl(cacheKey);
    if (cachedUrl) {
      return NextResponse.json({ url: cachedUrl, cached: true });
    }

    if (!redemption.usage_redeem_key) {
      return NextResponse.json({ error: "Link expired or offer no longer available" }, { status: 410 });
    }

    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const redeemApiUrl = process.env.ACCESS_REDEEM_API_URL || "https://redeem.adcrws.com";
    const apiUrl = `${redeemApiUrl}/v1/redeem/${redemption.offer_key}/${redemption.redeem_type}?access_token=${process.env.ACCESS_REDEEM_TOKEN}&member_key=${memberKey}&usage_redeem_key=${redemption.usage_redeem_key}`;

    const response = await fetch(apiUrl, { method: "GET", headers: { Accept: "application/json" } });
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = "Link expired or offer no longer available";
      if (responseText.includes("AccessDenied") || responseText.includes("<Error>")) {
        errorMessage = "Link expired or offer no longer available";
      }
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch { }
      return NextResponse.json({ error: errorMessage }, { status: 410 });
    }

    let redemptionData;
    try {
      redemptionData = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: "Invalid response from server" }, { status: 500 });
    }

    const freshUrl =
      redemptionData.details?.link ||
      redemptionData.url ||
      redemptionData.redemption_url ||
      redemptionData.link ||
      null;

    if (!freshUrl) {
      return NextResponse.json({ error: "Link expired or offer no longer available" }, { status: 410 });
    }

    setCachedUrl(cacheKey, freshUrl);
    return NextResponse.json({ url: freshUrl, cached: false });
  } catch (err) {
    return NextResponse.json({ error: "Link expired or offer no longer available" }, { status: 500 });
  }
}
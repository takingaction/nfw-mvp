import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{
    offerKey: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`redeem:${ip}`, 10, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const resolvedParams = await params;
    const { offerKey } = resolvedParams;
    const { method, location_key } = await request.json();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check account age (minimum 48 hours before redeeming) - disabled via ACCOUNT_AGE_CHECK_ENABLED env var
    const isAccountAgeCheckEnabled = process.env.ACCOUNT_AGE_CHECK_ENABLED !== "false";
    if (isAccountAgeCheckEnabled) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("joined_at")
        .eq("id", user.id)
        .single();

      if (profile?.joined_at) {
        const joinedAt = new Date(profile.joined_at);
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        if (joinedAt > fortyEightHoursAgo) {
          return NextResponse.json(
            { error: "Your account must be at least 48 hours old before redeeming offers" },
            { status: 403 }
          );
        }
      }
    }

    // Note: Duplicate redemption check removed - Access Perks API now handles usage limits
    // We track redemptions locally for dashboard purposes regardless of offer limits

    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    const redeemApiUrl = process.env.ACCESS_REDEEM_API_URL || "https://redeem.adcrws.com";
    let apiUrl = `https://redeem.adcrws.com/v1/redeem/${offerKey}/${method}?access_token=${process.env.ACCESS_REDEEM_TOKEN}&member_key=${memberKey}`;

    if (location_key) {
      apiUrl += `&location_key=${location_key}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = "Redemption failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        if (errorMessage.includes("limit") || errorMessage.includes("use") || errorMessage.includes("remaining")) {
          errorMessage = "This offer has reached its redemption limit. No uses remaining.";
        }
      } catch {
        // Use default error message
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status },
      );
    }

    const redemptionData = await response.json();

    let offerDetailsUrl = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers/${offerKey}?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;
    if (location_key) {
      offerDetailsUrl += `&location_key=${location_key}`;
    }

    const offerResponse = await fetch(offerDetailsUrl);

    let offerDetails: {
      title?: string;
      offer_value?: string | number;
      offer_store?: { name?: string; logo_url?: string };
      physical_location?: { location_name?: string; city_locality?: string };
      expires_on?: string;
    } = {};
    if (offerResponse.ok) {
      const offerData = await offerResponse.json();
      if (offerData.offers && offerData.offers.length > 0) {
        offerDetails = offerData.offers[0];
      }
    }

    const usageRedeemKey =
      redemptionData.usage_redeem_key ||
      redemptionData.redeem_key ||
      redemptionData.details?.usage_redeem_key ||
      redemptionData.details?.redeem_key ||
      null;

    const finalRedemptionUrl =
      redemptionData.details?.link ||
      redemptionData.url ||
      redemptionData.redemption_url ||
      redemptionData.link ||
      null;

    const promotionCode =
      redemptionData.promotion_code ||
      redemptionData.coupon_code ||
      redemptionData.details?.promotion_code ||
      redemptionData.details?.coupon_code ||
      null;

    let phoneNumber = redemptionData.phone_number || null;
    if (!phoneNumber) {
      const messageText =
        redemptionData.instructions ||
        redemptionData.details?.display ||
        redemptionData.display_message ||
        "";
      const phoneMatch = messageText.match(
        /\b1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b|\b1-[0-9]{3}-[A-Z]{3}-[A-Z]{4}\b/i,
      );
      if (phoneMatch) {
        phoneNumber = phoneMatch[0].trim();
      }
    }

    const instructions =
      redemptionData.instructions ||
      redemptionData.details?.display ||
      redemptionData.display_message ||
      redemptionData.message ||
      null;

    const displayMessage =
      redemptionData.display_message ||
      redemptionData.details?.display ||
      redemptionData.message ||
      null;

    let expiresAt = null;
    if (offerDetails.expires_on) {
      expiresAt = new Date(offerDetails.expires_on).toISOString();
    }

    await supabase.from("offer_redemptions").insert({
      user_id: user.id,
      offer_key: offerKey,
      usage_redeem_key: usageRedeemKey,
      redeem_type: method,
      offer_title: offerDetails.title || "Unknown Offer",
      store_name: offerDetails.offer_store?.name || null,
      store_logo_url: offerDetails.offer_store?.logo_url || null,
      location_name:
        offerDetails.physical_location?.location_name ||
        offerDetails.physical_location?.city_locality ||
        null,
      offer_value: offerDetails.offer_value || null,
      redemption_url: finalRedemptionUrl,
      coupon_code: promotionCode,
      phone_number: phoneNumber,
      instructions: instructions,
      display_message: displayMessage,
      expires_at: expiresAt,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      redemption_url: finalRedemptionUrl,
      promotion_code: promotionCode,
      coupon_code: promotionCode,
      display_message: displayMessage,
      message: redemptionData.message,
      phone_number: phoneNumber,
      instructions: instructions,
      terms: redemptionData.details?.terms_of_use,
      raw_response: redemptionData,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to redeem offer" },
      { status: 500 },
    );
  }
}
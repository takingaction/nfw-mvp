import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    offerKey: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const { offerKey } = resolvedParams;
    const { method, location_key } = await request.json(); // ✅ ADDED location_key

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sanitize member_key
    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    console.log("🔄 Redeeming offer:", {
      offerKey,
      method,
      memberKey,
      location_key,
    }); // ✅ Log location_key

    // Build API URL with location_key if provided
    let apiUrl = `https://redeem.adcrws-stage.com/v1/redeem/${offerKey}/${method}?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;

    // ✅ ADD location_key to URL if provided
    if (location_key) {
      apiUrl += `&location_key=${location_key}`;
      console.log("📍 Using location_key:", location_key);
    }

    console.log(
      "📡 Calling redemption URL:",
      apiUrl.replace(process.env.ACCESS_OFFERS_TOKEN!, "HIDDEN"),
    );

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("📡 Redemption API status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Redemption API error:", errorText);
      return NextResponse.json(
        { error: `Redemption failed: ${errorText}` },
        { status: response.status },
      );
    }

    const redemptionData = await response.json();
    console.log(
      "✅ Redemption API response:",
      JSON.stringify(redemptionData, null, 2),
    );

    // Get offer details for tracking - include location_key if provided
    let offerDetailsUrl = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers/${offerKey}?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;
    if (location_key) {
      offerDetailsUrl += `&location_key=${location_key}`;
    }

    const offerResponse = await fetch(offerDetailsUrl);

    let offerDetails: any = {};
    if (offerResponse.ok) {
      const offerData = await offerResponse.json();
      if (offerData.offers && offerData.offers.length > 0) {
        offerDetails = offerData.offers[0];
      }
    }

    // Extract usage_redeem_key from API response
    const usageRedeemKey =
      redemptionData.usage_redeem_key ||
      redemptionData.redeem_key ||
      redemptionData.details?.usage_redeem_key ||
      redemptionData.details?.redeem_key ||
      null;

    // Extract redemption URL
    const finalRedemptionUrl =
      redemptionData.details?.link ||
      redemptionData.url ||
      redemptionData.redemption_url ||
      redemptionData.link ||
      null;

    // Extract promotion code - check multiple locations
    const promotionCode =
      redemptionData.promotion_code ||
      redemptionData.coupon_code ||
      redemptionData.details?.promotion_code ||
      redemptionData.details?.coupon_code ||
      null;

    // Extract phone number from instructions if present
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

    // Extract instructions and display message - check multiple locations
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

    // Calculate expiration date (if offer has expires_on)
    let expiresAt = null;
    if (offerDetails.expires_on) {
      expiresAt = new Date(offerDetails.expires_on).toISOString();
    }

    console.log("🔑 Usage redeem key:", usageRedeemKey);
    console.log("🎟️ Promotion code:", promotionCode);
    console.log("📞 Phone number:", phoneNumber);
    console.log("📋 Instructions:", instructions);
    console.log("💬 Display message:", displayMessage);
    console.log("📅 Expires at:", expiresAt);

    // Track redemption in database with all details
    const { error: dbError } = await supabase.from("offer_redemptions").insert({
      user_id: user.id,
      offer_key: offerKey,
      usage_redeem_key: usageRedeemKey,
      redeem_type: method,
      offer_title: offerDetails.title || "Unknown Offer",
      store_name: offerDetails.offer_store?.name || null,
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

    if (dbError) {
      console.error("Failed to track redemption:", dbError);
      // Don't fail the redemption if tracking fails
    } else {
      console.log("✅ Redemption tracked in database with full details");
    }

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
  } catch (error: any) {
    console.error("❌ Redemption error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to redeem offer" },
      { status: 500 },
    );
  }
}

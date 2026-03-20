"use client";

import { useState, useEffect, use } from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  ExternalLink,
  Phone,
  Store,
  Printer,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import LocationSelector from "@/components/LocationSelector";

interface OfferDetailPageProps {
  params: Promise<{
    offerKey: string;
  }>;
}

export default function OfferDetailPage({ params }: OfferDetailPageProps) {
  const resolvedParams = use(params);
  const { offerKey } = resolvedParams;

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingLink, setRedeemingLink] = useState(false);
  const [redeemingInstore, setRedeemingInstore] = useState(false);
  const [redeemingCall, setRedeemingCall] = useState(false);
  const [redeemingPrint, setRedeemingPrint] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);

  // Location selector state
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [pendingRedemptionMethod, setPendingRedemptionMethod] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchOffer();
  }, [offerKey]);

  const fetchOffer = async () => {
    try {
      const response = await fetch(`/api/access-perks/offers/${offerKey}`);

      if (!response.ok) {
        throw new Error("Failed to fetch offer");
      }

      const data = await response.json();

      if (data.offers && data.offers.length > 0) {
        setOffer(data.offers[0]);
      } else {
        throw new Error("Offer not found");
      }
    } catch (err: any) {
      console.error("Fetch offer error:", err);
      setError(err.message || "Failed to load offer");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (method: string) => {
    // Check if this is a multi-location offer that needs location selection
    const isMultiLocation =
      offer?.offer_group_key &&
      (method === "instore_print" || method === "instore");

    if (isMultiLocation && !selectedLocation) {
      setPendingRedemptionMethod(method);
      setShowLocationSelector(true);
      return;
    }

    // Proceed with redemption
    try {
      setRedemptionResult(null);

      if (method === "link") setRedeemingLink(true);
      else if (method === "instore") setRedeemingInstore(true);
      else if (method === "call") setRedeemingCall(true);
      else if (method === "instore_print") setRedeemingPrint(true);

      const body: any = { method };
      if (selectedLocation) {
        body.location_key = selectedLocation.key;
      }

      const response = await fetch(
        `/api/access-perks/offers/${offerKey}/redeem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed (${response.status})`);
      }

      const data = await response.json();

      if (method === "link") {
        let finalUrl =
          data.redemption_url || data.url || data.link || data.redemption_link;

        if (!finalUrl) {
          throw new Error("No redemption URL received");
        }

        if (finalUrl.includes("<a href=")) {
          const match = finalUrl.match(/href="([^"]+)"/);
          if (match && match[1]) {
            finalUrl = match[1];
          }
        }

        window.open(finalUrl, "_blank", "noopener,noreferrer");

        const promoCode = data.promotion_code || data.coupon_code;

        setRedemptionResult({
          success: true,
          message:
            "Redemption initiated! The offer page should open in a new tab.",
          redemptionUrl: finalUrl,
          couponCode: promoCode,
        });
      } else if (method === "instore_print") {
        const printUrl =
          data.print_url ||
          data.coupon_url ||
          data.pdf_url ||
          data.redemption_url;
        const couponCode =
          data.coupon_code || data.promotion_code || data.barcode;

        if (printUrl) {
          // Use native Access Perks coupon
          window.open(printUrl, "_blank", "noopener,noreferrer");
          setRedemptionResult({
            success: true,
            message: selectedLocation
              ? `Print coupon opened for ${selectedLocation.name}.`
              : "Print coupon opened in a new tab.",
            redemptionUrl: printUrl,
            couponCode: couponCode,
          });
        } else {
          throw new Error("No print URL received from API");
        }
      } else if (method === "instore") {
        const couponUrl =
          data.redemption_url || data.raw_response?.details?.link;

        if (couponUrl) {
          window.open(couponUrl, "_blank", "noopener,noreferrer");

          setRedemptionResult({
            success: true,
            message: selectedLocation
              ? `Your in-store coupon for ${selectedLocation.name} has been opened in a new tab.`
              : "Your in-store coupon has been opened in a new tab.",
            redemptionUrl: couponUrl,
            instructions:
              "Show the coupon from the new tab at checkout to redeem your offer.",
          });
        } else {
          throw new Error("No coupon URL received from API");
        }
      } else if (method === "call") {
        let phoneNumber =
          data.phone_number ||
          data.phoneNumber ||
          data.phone ||
          data.contact_number ||
          offer?.physical_location?.phone_number ||
          offer?.offer_store?.phone_number;

        if (!phoneNumber) {
          const messageText = data.display_message || data.instructions || "";
          const phoneMatch = messageText.match(
            /\b1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b|\b1-[0-9]{3}-[A-Z]{3}-[A-Z]{4}\b/i,
          );
          if (phoneMatch) {
            phoneNumber = phoneMatch[0].trim();
          }
        }

        setRedemptionResult({
          success: true,
          message:
            data.display_message || data.message || "Call to redeem this offer",
          phoneNumber: phoneNumber,
          couponCode: data.promotion_code || data.coupon_code,
          instructions:
            data.instructions ||
            data.display_message ||
            "Call the number above and mention the promo code",
        });
      }
    } catch (err: any) {
      setRedemptionResult({
        success: false,
        message: err.message || "Failed to redeem. Please try again.",
      });
    } finally {
      if (method === "link") setRedeemingLink(false);
      else if (method === "instore") setRedeemingInstore(false);
      else if (method === "call") setRedeemingCall(false);
      else if (method === "instore_print") setRedeemingPrint(false);
    }
  };

  const handleRedeemWithLocation = async (
    method: string,
    location: { key: string; name: string },
  ) => {
    try {
      setRedemptionResult(null);

      if (method === "link") setRedeemingLink(true);
      else if (method === "instore") setRedeemingInstore(true);
      else if (method === "call") setRedeemingCall(true);
      else if (method === "instore_print") setRedeemingPrint(true);

      const body: any = {
        method,
        location_key: location.key,
      };

      const response = await fetch(
        `/api/access-perks/offers/${offerKey}/redeem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed (${response.status})`);
      }

      const data = await response.json();

      if (method === "link") {
        let finalUrl =
          data.redemption_url || data.url || data.link || data.redemption_link;

        if (!finalUrl) {
          throw new Error("No redemption URL received");
        }

        if (finalUrl.includes("<a href=")) {
          const match = finalUrl.match(/href="([^"]+)"/);
          if (match && match[1]) {
            finalUrl = match[1];
          }
        }

        window.open(finalUrl, "_blank", "noopener,noreferrer");

        const promoCode = data.promotion_code || data.coupon_code;

        setRedemptionResult({
          success: true,
          message: `Redemption initiated for ${location.name}! The offer page should open in a new tab.`,
          redemptionUrl: finalUrl,
          couponCode: promoCode,
        });
      } else if (method === "instore_print") {
        const printUrl =
          data.print_url ||
          data.coupon_url ||
          data.pdf_url ||
          data.redemption_url;
        const couponCode =
          data.coupon_code || data.promotion_code || data.barcode;

        if (printUrl) {
          // Use native Access Perks coupon
          window.open(printUrl, "_blank", "noopener,noreferrer");
          setRedemptionResult({
            success: true,
            message: `Print coupon opened for ${location.name}.`,
            redemptionUrl: printUrl,
            couponCode: couponCode,
          });
        } else {
          throw new Error("No print URL received from API");
        }
      } else if (method === "instore") {
        const couponUrl =
          data.redemption_url || data.raw_response?.details?.link;

        if (couponUrl) {
          window.open(couponUrl, "_blank", "noopener,noreferrer");

          setRedemptionResult({
            success: true,
            message: `Your in-store coupon for ${location.name} has been opened in a new tab.`,
            redemptionUrl: couponUrl,
            instructions:
              "Show the coupon from the new tab at checkout to redeem your offer.",
          });
        } else {
          throw new Error("No coupon URL received from API");
        }
      } else if (method === "call") {
        let phoneNumber =
          data.phone_number ||
          data.phoneNumber ||
          data.phone ||
          data.contact_number ||
          offer?.physical_location?.phone_number ||
          offer?.offer_store?.phone_number;

        if (!phoneNumber) {
          const messageText = data.display_message || data.instructions || "";
          const phoneMatch = messageText.match(
            /\b1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b|\b1-[0-9]{3}-[A-Z]{3}-[A-Z]{4}\b/i,
          );
          if (phoneMatch) {
            phoneNumber = phoneMatch[0].trim();
          }
        }

        setRedemptionResult({
          success: true,
          message:
            data.display_message ||
            data.message ||
            `Call ${location.name} to redeem this offer`,
          phoneNumber: phoneNumber,
          couponCode: data.promotion_code || data.coupon_code,
          instructions:
            data.instructions ||
            data.display_message ||
            "Call the number above and mention the promo code",
        });
      }
    } catch (err: any) {
      setRedemptionResult({
        success: false,
        message: err.message || "Failed to redeem. Please try again.",
      });
    } finally {
      if (method === "link") setRedeemingLink(false);
      else if (method === "instore") setRedeemingInstore(false);
      else if (method === "call") setRedeemingCall(false);
      else if (method === "instore_print") setRedeemingPrint(false);
    }
  };

  const handleLocationSelected = (
    locationKey: string,
    locationName: string,
  ) => {
    const newLocation = { key: locationKey, name: locationName };
    setSelectedLocation(newLocation);
    setShowLocationSelector(false);

    // Auto-proceed with the pending redemption using the new location directly
    if (pendingRedemptionMethod) {
      setTimeout(() => {
        handleRedeemWithLocation(pendingRedemptionMethod, newLocation);
        setPendingRedemptionMethod(null);
      }, 100);
    }
  };

  const formatExpiry = (date: string) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) return "Expired";
    if (daysUntilExpiry === 0) return "Expires today";
    if (daysUntilExpiry === 1) return "Expires tomorrow";
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    return `Expires ${expiryDate.toLocaleDateString()}`;
  };

  const decodeHtml = (html: string) => {
    if (typeof window === "undefined") return html;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html || "";
    return textarea.value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#BCAFCF]" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#2d1239] mb-2">
            Offer Not Found
          </h2>
          <p className="text-[#2d1239]/60 mb-6">
            {error || "Could not load offer"}
          </p>
          <Link
            href="/perks"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2d1239] text-white rounded-xl hover:bg-[#2d1239]/90 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Perks
          </Link>
        </div>
      </div>
    );
  }

  const {
    title,
    description,
    teaser,
    long_description,
    savings_amount,
    logo_url,
    offer_photo_url,
    expires_on,
    offer_store,
    physical_location,
    redemption_methods,
    categories,
    terms_and_conditions,
    discount_percent,
    offer_group_key,
  } = offer;

  const fullDescription = long_description || description || teaser || "";
  const imageUrl = offer_photo_url || logo_url;
  const isMultiLocation = !!offer_group_key;

  return (
    <div className="min-h-screen bg-white">
      {/* Location Selector Modal */}
      {showLocationSelector && offer_group_key && (
        <LocationSelector
          offerGroupKey={offer_group_key}
          offerTitle={title}
          onSelectLocation={handleLocationSelected}
          onClose={() => {
            setShowLocationSelector(false);
            setPendingRedemptionMethod(null);
          }}
          userZip={physical_location?.postal_code}
        />
      )}

      <div className="bg-white border-b border-[#2d1239]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/perks"
            className="inline-flex items-center gap-2 text-[#2d1239]/60 hover:text-[#2d1239] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Perks
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-lg border border-[#2d1239]/10 bg-[#f8f7fa] overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl opacity-30">🎁</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {offer_store && (
                    <div className="mb-1">
                      <h2
                        className="text-base font-semibold text-[#2d1239] break-words [&_sup]:text-[0.6em] [&_sup]:align-super"
                        dangerouslySetInnerHTML={{
                          __html: decodeHtml(offer_store.name),
                        }}
                      />
                      {offer_store.website && (
                        <a
                          href={offer_store.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2d1239]/60 hover:text-[#2d1239] text-xs flex items-center gap-1 transition-colors"
                        >
                          Visit Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {savings_amount && (
                      <span className="text-xs bg-[#d4f1ad] text-[#2d1239] px-2.5 py-1 rounded-full font-medium">
                        {savings_amount}
                      </span>
                    )}

                    {discount_percent && discount_percent > 0 && (
                      <span className="text-xs bg-[#BCAFCF]/20 text-[#2d1239] px-2.5 py-1 rounded-full font-medium">
                        {discount_percent}% Off
                      </span>
                    )}

                    {isMultiLocation && (
                      <span className="text-xs bg-[#fdf493]/30 text-[#2d1239] px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Multiple Locations
                      </span>
                    )}

                    {categories &&
                      categories.slice(0, 2).map((cat: any) => (
                        <span
                          key={cat.category_key}
                          className="text-xs bg-[#f8f7fa] text-[#2d1239]/60 px-2.5 py-1 rounded-full"
                        >
                          {cat.category_name}
                        </span>
                      ))}
                  </div>

                  {expires_on && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-[#2d1239]/50">
                      <Clock className="w-3 h-3" />
                      {formatExpiry(expires_on)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
              <h1
                className="text-xl font-bold text-[#2d1239] mb-3 [&_sup]:text-[0.6em] [&_sup]:align-super"
                dangerouslySetInnerHTML={{ __html: decodeHtml(title) }}
              />

              {fullDescription && (
                <div
                  className="text-[#2d1239]/70 text-sm whitespace-pre-wrap [&_sup]:text-[0.6em] [&_sup]:align-super"
                  dangerouslySetInnerHTML={{
                    __html: decodeHtml(fullDescription),
                  }}
                />
              )}
            </div>

            {selectedLocation && (
              <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <MapPin className="w-4 h-4 text-[#2d1239] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2d1239]">
                        Selected Location:
                      </p>
                      <p className="text-sm text-[#2d1239]/70">
                        {selectedLocation.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-xs text-[#2d1239]/60 hover:text-[#2d1239] underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {physical_location && !isMultiLocation && (
              <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
                <h3 className="text-base font-semibold text-[#2d1239] mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#BCAFCF]" />
                  Location
                </h3>
                <div className="space-y-1 text-sm text-[#2d1239]/70">
                  {physical_location.location_name && (
                    <p className="font-medium text-[#2d1239]">
                      {physical_location.location_name}
                    </p>
                  )}
                  {physical_location.address_line_1 && (
                    <p>{physical_location.address_line_1}</p>
                  )}
                  {physical_location.address_line_2 && (
                    <p>{physical_location.address_line_2}</p>
                  )}
                  <p>
                    {physical_location.city_locality},{" "}
                    {physical_location.state_region}{" "}
                    {physical_location.postal_code}
                  </p>
                  {physical_location.phone_number && (
                    <p className="flex items-center gap-2 pt-1">
                      <Phone className="w-3 h-3 text-[#BCAFCF]" />
                      {physical_location.phone_number}
                    </p>
                  )}
                </div>
              </div>
            )}

            {terms_and_conditions && (
              <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
                <h3 className="text-base font-semibold text-[#2d1239] mb-3">
                  Terms & Conditions
                </h3>
                <div className="text-xs text-[#2d1239]/50 whitespace-pre-wrap">
                  {terms_and_conditions}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              {redemptionResult && (
                <div
                  className={`rounded-xl p-4 ${
                    redemptionResult.success
                      ? "bg-[#d4f1ad]/20 border border-[#d4f1ad]"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {redemptionResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium mb-1 ${
                          redemptionResult.success
                            ? "text-[#2d1239]"
                            : "text-red-900"
                        }`}
                      >
                        {redemptionResult.success ? "Success!" : "Error"}
                      </p>
                      <p
                        className={`text-sm mb-3 ${
                          redemptionResult.success
                            ? "text-[#2d1239]/70"
                            : "text-red-800"
                        }`}
                      >
                        {redemptionResult.message}
                      </p>

                      {redemptionResult.redemptionUrl && (
                        <div className="space-y-2">
                          <a
                            href={redemptionResult.redemptionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Offer Page
                          </a>
                          <p className="text-xs text-[#2d1239]/50">
                            If the page didn&apos;t open automatically, click
                            above
                          </p>
                        </div>
                      )}

                      {redemptionResult.couponCode && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-[#2d1239]/10">
                          <p className="text-xs text-[#2d1239]/50 mb-1">
                            Promo Code:
                          </p>
                          <p className="text-base font-mono font-bold text-[#2d1239]">
                            {redemptionResult.couponCode}
                          </p>
                        </div>
                      )}

                      {redemptionResult.phoneNumber && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-[#2d1239]/10">
                          <p className="text-xs text-[#2d1239]/50 mb-1">
                            Call:
                          </p>
                          <p className="text-base font-semibold text-[#2d1239]">
                            {redemptionResult.phoneNumber}
                          </p>
                        </div>
                      )}

                      {redemptionResult.instructions &&
                        !redemptionResult.redemptionUrl && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-[#2d1239]/10">
                            <p className="text-xs text-[#2d1239]/50 mb-1">
                              Instructions:
                            </p>
                            <p className="text-sm text-[#2d1239]">
                              {redemptionResult.instructions}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {redemption_methods && redemption_methods.length > 0 && (
                <div className="bg-white rounded-xl border border-[#2d1239]/10 p-5">
                  <h3 className="text-base font-semibold text-[#2d1239] mb-4">
                    Redeem This Offer
                  </h3>
                  <div className="space-y-3">
                    {redemption_methods.includes("link") && (
                      <button
                        onClick={() => handleRedeem("link")}
                        disabled={redeemingLink}
                        className="w-full px-4 py-2.5 bg-[#2d1239] text-white rounded-xl hover:bg-[#2d1239]/90 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                      >
                        {redeemingLink ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            Redeem Online
                          </>
                        )}
                      </button>
                    )}

                    {redemption_methods.includes("instore") && (
                      <button
                        onClick={() => handleRedeem("instore")}
                        disabled={redeemingInstore}
                        className="w-full px-4 py-2.5 bg-[#BCAFCF] text-[#2d1239] rounded-xl hover:bg-[#BCAFCF]/80 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                      >
                        {redeemingInstore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <Store className="w-4 h-4" />
                            Redeem In-Store
                          </>
                        )}
                      </button>
                    )}

                    {redemption_methods.includes("instore_print") && (
                      <button
                        onClick={() => handleRedeem("instore_print")}
                        disabled={redeemingPrint}
                        className="w-full px-4 py-2.5 bg-[#b2d1ee] text-[#2d1239] rounded-xl hover:bg-[#b2d1ee]/80 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                      >
                        {redeemingPrint ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <Printer className="w-4 h-4" />
                            Print Coupon
                          </>
                        )}
                      </button>
                    )}

                    {redemption_methods.includes("call") && (
                      <button
                        onClick={() => handleRedeem("call")}
                        disabled={redeemingCall}
                        className="w-full px-4 py-2.5 bg-[#d4f1ad] text-[#2d1239] rounded-xl hover:bg-[#d4f1ad]/80 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                      >
                        {redeemingCall ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Redeeming...
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4" />
                            Redeem by Phone
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 p-2.5 bg-[#fdf493]/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#2d1239] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#2d1239]/60">
                        Online redemptions open in a new tab.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

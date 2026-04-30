"use client";

import { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Clock,
  ExternalLink,
  Phone,
  Store,
  Printer,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Globe,
  User,
  Heart,
} from "lucide-react";
import Link from "next/link";

interface OfferDetailPanelProps {
  offerKey: string | null;
  isOpen: boolean;
  onClose: () => void;
  likedStores?: number[];
  onToggleLike?: (storeKey: number, storeName: string, logoUrl: string | undefined, liked: boolean) => void;
}

interface Offer {
  title: string;
  description?: string;
  teaser?: string;
  long_description?: string;
  savings_amount?: string;
  logo_url?: string;
  offer_photo_url?: string;
  expires_on?: string;
  offer_store?: any;
  physical_location?: any;
  redemption_methods?: string[];
  categories?: any[];
  terms_and_conditions?: string;
  terms_of_use?: string;
  discount_percent?: number;
  offer_group_key?: string;
}

interface Location {
  location_key?: string | number;
  location_name?: string;
  name?: string;
  street_address?: string;
  extended_street_address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city_locality?: string;
  state_region?: string;
  postal_code?: string;
  phone_number?: string;
  distance?: string;
  distance_miles?: string;
  search_distance?: number | string;
  physical_location?: {
    location_key?: string | number;
    location_name?: string;
    street_address?: string;
    extended_street_address?: string;
    address_line_1?: string;
    address_line_2?: string;
    city_locality?: string;
    state_region?: string;
    postal_code?: string;
    phone_number?: string;
  };
}

const getLocationName = (loc: Location): string => {
  const raw = loc.location_name || loc.name || loc.physical_location?.location_name || "Unknown Location";
  if (typeof window === "undefined") return raw;
  const div = document.createElement("div");
  div.innerHTML = raw;
  return div.textContent || raw;
};

const getLocationKey = (loc: Location): string | number => {
  return loc.location_key || loc.physical_location?.location_key || "";
};

const getStreetAddress = (loc: Location): string => {
  return loc.street_address || loc.physical_location?.street_address ||
    loc.physical_location?.address_line_1 || loc.address_line_1 || "";
};

const getExtendedAddress = (loc: Location): string => {
  return loc.extended_street_address || loc.physical_location?.extended_street_address ||
    loc.physical_location?.address_line_2 || loc.address_line_2 || "";
};

const getCityStateZip = (loc: Location): string => {
  const city = loc.city_locality || loc.physical_location?.city_locality || "";
  const state = loc.state_region || loc.physical_location?.state_region || "";
  const zip = loc.postal_code || loc.physical_location?.postal_code || "";
  return `${city}${city && state ? ", " : ""}${state} ${zip}`.trim();
};

const getDistance = (loc: Location): string => {
  if (loc.search_distance !== undefined) {
    return typeof loc.search_distance === 'number' 
      ? `${loc.search_distance.toFixed(1)}mi` 
      : loc.search_distance.toString();
  }
  return loc.distance || loc.distance_miles || "";
};

export default function OfferDetailPanel({
  offerKey,
  isOpen,
  onClose,
  likedStores = [],
  onToggleLike,
}: OfferDetailPanelProps) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStoreLiked, setIsStoreLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [redeemingLink, setRedeemingLink] = useState(false);
  const [redeemingInstore, setRedeemingInstore] = useState(false);
  const [redeemingCall, setRedeemingCall] = useState(false);
  const [redeemingPrint, setRedeemingPrint] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);
  const [customRedemption, setCustomRedemption] = useState<{
    display?: string;
    termsOfUse?: string;
    promoCode?: string;
    redemptionUrl?: string;
    method: 'link' | 'instore' | 'instore_print';
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [searchDistance, setSearchDistance] = useState("100mi");
  const [searchZip, setSearchZip] = useState("");
  const [profileZip, setProfileZip] = useState<string | null>(null);
  const [usesRemaining, setUsesRemaining] = useState<{
    usable: boolean;
    uses_remaining: string | number;
    number_of_uses_remaining: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      if (offerKey) {
        fetchOffer(offerKey);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(false);
        });
      });
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setOffer(null);
        setError(null);
        setRedemptionResult(null);
        setSelectedLocation(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, offerKey]);

  useEffect(() => {
    if (offer?.offer_store?.key) {
      setIsStoreLiked(likedStores.includes(offer.offer_store.key));
    }
  }, [offer, likedStores]);

  const fetchOffer = async (key: string) => {
    setLoading(true);
    setError(null);
    setUsesRemaining(null);
    try {
      const response = await fetch(`/api/access-perks/offers/${key}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sign in to see offer details");
        }
        throw new Error("Failed to fetch offer");
      }

      const data = await response.json();

      if (data.offers && data.offers.length > 0) {
        setOffer(data.offers[0]);
      } else {
        throw new Error("Offer not found");
      }

      // Fetch uses remaining
      try {
        const usesRes = await fetch(`/api/access-perks/offers/${key}/uses-remaining`);
        if (usesRes.ok) {
          const usesData = await usesRes.json();
          setUsesRemaining(usesData);
        }
      } catch {
        // Silently fail - uses remaining is not critical
      }
    } catch (err: any) {
      setError(err.message || "Failed to load offer");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async (offerGroupKey: string, zipCode?: string, distance?: string) => {
    setLoadingLocations(true);
    try {
      const params = new URLSearchParams({ offer_group: offerGroupKey });
      if (zipCode) {
        params.set("postal_code", zipCode);
      }
      params.set("distance", distance || "100mi");
      params.set("per_page", "10");

      const response = await fetch(`/api/access-perks/locations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    if (offer?.offer_group_key) {
      fetchLocations(offer.offer_group_key, undefined, searchDistance);
    } else {
      setLocations([]);
    }
  }, [offer?.offer_group_key, searchDistance]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.zip) {
            setProfileZip(data.zip);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleToggleLike = () => {
    if (!offer?.offer_store) return;
    const storeKey = offer.offer_store.key;
    const storeName = offer.offer_store.name || "Unknown Store";
    const logoUrl = offer.offer_store.logo_url;
    const newLiked = !isStoreLiked;
    setIsStoreLiked(newLiked);
    setLikeAnimating(true);
    onToggleLike?.(storeKey, storeName, logoUrl, newLiked);
    setTimeout(() => setLikeAnimating(false), 300);
  };

  const handleRedeem = async (method: string, forcedLocationKey?: string) => {
    if (!offer) return;

    const effectiveLocationKey = forcedLocationKey || selectedLocation?.key;

    try {
      setRedemptionResult(null);

      if (method === "link") setRedeemingLink(true);
      else if (method === "instore") setRedeemingInstore(true);
      else if (method === "call") setRedeemingCall(true);
      else if (method === "instore_print") setRedeemingPrint(true);

      const body: any = { method };
      if (effectiveLocationKey) {
        body.location_key = effectiveLocationKey;
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
        const details = data.details || {};

        if (details.display) {
          setCustomRedemption({
            display: details.display,
            termsOfUse: details.terms_of_use,
            promoCode: details.promotion_code,
            redemptionUrl: details.link || data.redemption_url,
            method: 'link'
          });
          return;
        }

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

        const promoCode = data.promotion_code || data.coupon_code;
        const displayMessage = data.display_message || data.instructions;

        setRedemptionResult({
          success: true,
          message: displayMessage || "Click 'Open Website' to visit the offer page.",
          redemptionUrl: finalUrl,
          couponCode: promoCode,
        });
      } else if (method === "instore_print") {
        const details = data.details || {};
        const displayContent = data.display_message || details.display;

        if (displayContent) {
          setCustomRedemption({
            display: displayContent,
            termsOfUse: data.terms || data.details?.terms_of_use || details.terms,
            promoCode: details.promotion_code || data.promotion_code,
            redemptionUrl: details.link || data.redemption_url,
            method: 'instore_print'
          });
          return;
        }

        const printUrl =
          data.print_url ||
          data.coupon_url ||
          data.pdf_url ||
          details.link ||
          data.redemption_url;
        const couponCode =
          data.coupon_code || data.promotion_code || data.barcode;

        if (printUrl) {
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
        const details = data.details || {};
        const displayContent = data.display_message || details.display;

        if (displayContent) {
          setCustomRedemption({
            display: displayContent,
            termsOfUse: data.terms || data.details?.terms_of_use || details.terms,
            promoCode: details.promotion_code || data.promotion_code,
            redemptionUrl: details.link || data.redemption_url,
            method: 'instore'
          });
          return;
        }

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
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || "";
  };

  if (!isVisible) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-nfw-blackberry/50 transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        style={{
          transform: isOpen 
            ? (isAnimating ? "translateX(-100%)" : "translateX(0)") 
            : "translateX(-100%)",
          transition: "transform 300ms ease-out",
        }}
        className="fixed inset-y-0 left-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-nfw-blackberry/10 bg-white">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Results</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-nfw-blackberry/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-nfw-blackberry/60" />
            </button>
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-nfw-lilac" />
            </div>
          )}

          {error && !loading && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                {error === "Sign in to see offer details" ? (
                  <>
                    <User className="w-16 h-16 text-nfw-blackberry/30 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-nfw-blackberry mb-2">
                      Sign In Required
                    </h2>
                    <p className="text-nfw-blackberry/60 mb-6">
                      Please sign in to see offer details and redeem offers.
                    </p>
                    <Link
                      href="/auth/sign-up"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 font-medium transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Sign In
                    </Link>
                    <button
                      onClick={onClose}
                      className="block w-full mt-3 text-nfw-blackberry/50 hover:text-nfw-blackberry text-sm"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-nfw-blackberry mb-2">
                      Offer Not Found
                    </h2>
                    <p className="text-nfw-blackberry/60 mb-6">{error}</p>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 font-medium transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {offer && !loading && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-lg border border-nfw-blackberry/10 bg-nfw-dove overflow-hidden flex items-center justify-center">
                        {offer.offer_photo_url || offer.logo_url ? (
                          <img
                            src={offer.offer_photo_url || offer.logo_url}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-3xl opacity-30">🎁</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {offer.offer_store && (
                        <div className="mb-1">
                          <h2
                            className="text-base font-semibold text-nfw-blackberry break-words [&_sup]:text-[0.6em] [&_sup]:align-super"
                            dangerouslySetInnerHTML={{
                              __html: decodeHtml(offer.offer_store.name),
                            }}
                          />
                          <div className="flex items-center gap-3 mt-1">
                            {offer.offer_store.website && (
                              <a
                                href={offer.offer_store.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-nfw-blackberry/60 hover:text-nfw-blackberry text-xs flex items-center gap-1 transition-colors"
                              >
                                Visit Website
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={handleToggleLike}
                              className="flex items-center gap-1.5 text-xs transition-colors"
                            >
                              <Heart
                                className={`w-4 h-4 transition-all duration-200 ${
                                  isStoreLiked
                                    ? "fill-[#B693C0] text-[#B693C0]"
                                    : "fill-[#F8F19A] text-[#F8F19A]"
                                } ${likeAnimating ? "scale-125" : "scale-100"}`}
                              />
                              <span className={isStoreLiked ? "text-[#B693C0]" : "text-nfw-blackberry/60"}>
                                {isStoreLiked ? "Saved" : "Save"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {offer.savings_amount && (
                          <span className="text-xs bg-nfw-citrine text-nfw-blackberry px-2.5 py-1 rounded-full font-medium">
                            {offer.savings_amount}
                          </span>
                        )}

                        {offer.discount_percent && offer.discount_percent > 0 && (
                          <span className="text-xs bg-nfw-lilac/20 text-nfw-blackberry px-2.5 py-1 rounded-full font-medium">
                            {offer.discount_percent}% Off
                          </span>
                        )}

                        {offer.offer_group_key && (
                          <span className="text-xs bg-[#fdf493]/30 text-nfw-blackberry px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Multiple Locations
                          </span>
                        )}

                        {offer.categories &&
                          offer.categories.slice(0, 2).map((cat: any) => (
                            <span
                              key={cat.category_key}
                              className="text-xs bg-nfw-dove text-nfw-blackberry/60 px-2.5 py-1 rounded-full"
                            >
                              {cat.category_name}
                            </span>
                          ))}
                      </div>

                      {offer.expires_on && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-nfw-blackberry/50">
                          <Clock className="w-3 h-3" />
                          {formatExpiry(offer.expires_on)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                  <h1
                    className="font-serif text-xl lg:text-2xl text-nfw-blackberry mb-3 leading-tight [&_sup]:text-[0.6em] [&_sup]:align-super"
                    dangerouslySetInnerHTML={{ __html: decodeHtml(offer.title) }}
                  />

                  {offer.long_description || offer.description || offer.teaser ? (
                    <div
                      className="text-nfw-blackberry/70 text-sm whitespace-pre-wrap [&_sup]:text-[0.6em] [&_sup]:align-super"
                      dangerouslySetInnerHTML={{
                        __html: decodeHtml(
                          offer.long_description ||
                            offer.description ||
                            offer.teaser ||
                            "",
                        ),
                      }}
                    />
                  ) : null}
                </div>

                {(offer.offer_group_key || locations.length > 0) && (
                  <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                    <h3 className="text-base font-semibold text-nfw-blackberry mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-nfw-lilac" />
                      {loadingLocations ? "Finding nearby locations..." : "Nearby Locations"}
                    </h3>
                    
                    {offer.offer_group_key && !loadingLocations && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={searchZip}
                            onChange={(e) => setSearchZip(e.target.value)}
                            placeholder="ZIP code"
                            maxLength={5}
                            className="w-24 text-sm border border-nfw-blackberry/20 rounded-lg px-3 py-1.5 bg-white text-nfw-blackberry placeholder:text-nfw-blackberry/40"
                          />
                          <select
                          value={searchDistance}
                          onChange={(e) => setSearchDistance(e.target.value)}
                          className="text-sm border border-nfw-blackberry/20 rounded-lg px-3 py-1.5 bg-white text-nfw-blackberry"
                        >
                          <option value="5mi">5 mi</option>
                          <option value="10mi">10 mi</option>
                          <option value="25mi">25 mi</option>
                          <option value="50mi">50 mi</option>
                          <option value="100mi">100 mi</option>
                        </select>
                        <button
                          onClick={() => fetchLocations(offer.offer_group_key!, searchZip || undefined, searchDistance)}
                          className="text-sm bg-nfw-lilac text-nfw-blackberry px-4 py-1.5 rounded-lg hover:bg-nfw-lilac/80 font-medium"
                        >
                          Search
                        </button>
                        </div>
                        <p className="text-xs text-nfw-blackberry/50">
                          Leave blank to use your profile ZIP{profileZip && ` (${profileZip})`}
                        </p>
                      </div>
                    )}

                    {loadingLocations ? (
                      <div className="flex items-center gap-2 text-sm text-nfw-blackberry/50 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Locating stores near you...
                      </div>
                    ) : locations.length > 0 ? (
                      <ul className="space-y-2">
                        {locations.map((location, index) => {
                          const name = getLocationName(location);
                          const key = getLocationKey(location) || `location-${index}`;
                          const street = getStreetAddress(location);
                          const extended = getExtendedAddress(location);
                          const cityStateZip = getCityStateZip(location);
                          const distance = getDistance(location);
                          
                          return (
                            <li
                              key={key}
                              className="flex items-start gap-2 text-sm"
                            >
                              <MapPin className="w-3 h-3 text-nfw-blackberry/40 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-nfw-blackberry">
                                  {name}
                                </p>
                                {street && (
                                  <p className="text-nfw-blackberry/60 text-xs">
                                    {street}
                                    {extended && `, ${extended}`}
                                  </p>
                                )}
                                {cityStateZip && (
                                  <p className="text-nfw-blackberry/60 text-xs">
                                    {cityStateZip}
                                    {distance && (
                                      <span className="ml-2 text-nfw-lilac">
                                        ({distance})
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : offer.offer_group_key ? (
                      <p className="text-sm text-nfw-blackberry/70">
                        No locations found within {searchDistance.replace('mi', ' miles')}.
                        Try a larger distance.
                      </p>
                    ) : null}
                  </div>
                )}

                {selectedLocation && (
                  <div className="bg-nfw-citrine/20 border border-nfw-citrine rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <MapPin className="w-4 h-4 text-nfw-blackberry flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-nfw-blackberry">
                            Selected Location:
                          </p>
                          <p className="text-sm text-nfw-blackberry/70">
                            {selectedLocation.name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedLocation(null)}
                        className="text-xs text-nfw-blackberry/60 hover:text-nfw-blackberry underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {offer.physical_location && !offer.offer_group_key && (
                  <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                    <h3 className="text-base font-semibold text-nfw-blackberry mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-nfw-lilac" />
                      Location
                    </h3>
                    <div className="space-y-1 text-sm text-nfw-blackberry/70">
                      {offer.physical_location.location_name && (
                        <p className="font-medium text-nfw-blackberry">
                          {offer.physical_location.location_name}
                        </p>
                      )}
                      {offer.physical_location.address_line_1 && (
                        <p>{offer.physical_location.address_line_1}</p>
                      )}
                      {offer.physical_location.address_line_2 && (
                        <p>{offer.physical_location.address_line_2}</p>
                      )}
                      <p>
                        {offer.physical_location.city_locality},{" "}
                        {offer.physical_location.state_region}{" "}
                        {offer.physical_location.postal_code}
                      </p>
                      {offer.physical_location.phone_number && (
                        <p className="flex items-center gap-2 pt-1">
                          <Phone className="w-3 h-3 text-nfw-lilac" />
                          {offer.physical_location.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {(offer.terms_of_use || offer.terms_and_conditions) && (
                  <div className="bg-nfw-citrine/20 border border-nfw-citrine rounded-xl p-5">
                    <h3 className="text-base font-semibold text-nfw-blackberry mb-2">
                      Terms of Use
                    </h3>
                    <p className="text-xs text-nfw-blackberry/50 mb-3">
                      These terms apply when redeeming this offer
                    </p>
                    <div className="text-xs text-nfw-blackberry/70 whitespace-pre-wrap">
                      {offer.terms_of_use || offer.terms_and_conditions}
                    </div>
                  </div>
                )}

                {redemptionResult && (
                  <div
                    className={`rounded-xl p-4 ${
                      redemptionResult.success
                        ? "bg-nfw-citrine/20 border border-nfw-citrine"
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
                              ? "text-nfw-blackberry"
                              : "text-red-900"
                          }`}
                        >
                          {redemptionResult.success ? "Success!" : "Error"}
                        </p>
                        <p
                          className={`text-sm mb-3 ${
                            redemptionResult.success
                              ? "text-nfw-blackberry/70"
                              : "text-red-800"
                          } [&_a]:text-nfw-lilac [&_a]:underline`}
                          dangerouslySetInnerHTML={{ __html: redemptionResult.message }}
                        />

                        {redemptionResult.redemptionUrl && (
                          <a
                            href={redemptionResult.redemptionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white rounded-lg hover:bg-nfw-blackberry/90 transition-colors text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Website
                          </a>
                        )}

                        {redemptionResult.couponCode && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-nfw-blackberry/10">
                            <p className="text-xs text-nfw-blackberry/50 mb-1">
                              Promo Code:
                            </p>
                            <p className="text-base font-mono font-bold text-nfw-blackberry">
                              {redemptionResult.couponCode}
                            </p>
                          </div>
                        )}

                        {redemptionResult.phoneNumber && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-nfw-blackberry/10">
                            <p className="text-xs text-nfw-blackberry/50 mb-1">
                              Call:
                            </p>
                            <p className="text-base font-semibold text-nfw-blackberry">
                              {redemptionResult.phoneNumber}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {customRedemption && (
                  <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                    <h3 className="text-base font-semibold text-nfw-blackberry mb-4">
                      Redemption Instructions
                    </h3>

                    {customRedemption.display && (
                      <div
                        className="text-sm text-nfw-blackberry/70 mb-4 [&_a]:text-nfw-lilac [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: customRedemption.display }}
                      />
                    )}

                    {customRedemption.termsOfUse && (
                      <div className="text-xs text-nfw-blackberry/50 mb-4 border-t border-nfw-blackberry/10 pt-3">
                        <strong>Terms:</strong> {customRedemption.termsOfUse}
                      </div>
                    )}

                    {customRedemption.promoCode && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-nfw-blackberry/70">Promo Code:</span>
                        <span className="px-3 py-1 bg-nfw-lilac/20 text-nfw-aubergine font-mono font-bold">
                          {customRedemption.promoCode}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(customRedemption.promoCode!)}
                          className="text-xs text-nfw-blackberry/50 hover:text-nfw-blackberry underline"
                        >
                          Copy
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (customRedemption.redemptionUrl) {
                            window.open(customRedemption.redemptionUrl, "_blank", "noopener,noreferrer");
                          }
                          setCustomRedemption(null);
                        }}
                        className="w-full px-4 py-2.5 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 transition-colors font-medium"
                      >
                        Continue
                      </button>
                      <button
                        onClick={() => setCustomRedemption(null)}
                        className="w-full px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry/70 rounded-xl hover:bg-nfw-blackberry/5 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {usesRemaining && usesRemaining.number_of_uses_remaining >= 0 && (
                  <div className="bg-nfw-citrine/20 border border-nfw-citrine rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-nfw-blackberry">
                          {usesRemaining.number_of_uses_remaining === 0
                            ? "No Uses Remaining"
                            : `${usesRemaining.number_of_uses_remaining} ${usesRemaining.number_of_uses_remaining === 1 ? "Use" : "Uses"} Remaining`}
                        </p>
                        {usesRemaining.number_of_uses_remaining > 0 && usesRemaining.number_of_uses_remaining <= 3 && (
                          <p className="text-xs text-nfw-blackberry/60 mt-1">
                            Using this offer will consume one of your available redemptions
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {offer.redemption_methods && offer.redemption_methods.length > 0 && (
                  <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                    <h3 className="text-base font-semibold text-nfw-blackberry mb-4">
                      Redeem This Offer
                    </h3>
                    <div className="space-y-3">
                      {offer.redemption_methods.includes("link") && (
                        <button
                          onClick={() => handleRedeem("link")}
                          disabled={!!redeemingLink || !!(usesRemaining && usesRemaining.number_of_uses_remaining === 0)}
                          className="w-full px-4 py-2.5 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                        >
                          {redeemingLink ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : usesRemaining && usesRemaining.number_of_uses_remaining === 0 ? (
                            "Offer Limit Reached"
                          ) : (
                            <>
                              <Globe className="w-4 h-4" />
                              Redeem Online
                            </>
                          )}
                        </button>
                      )}

                      {offer.redemption_methods.includes("instore") && (
                        <button
                          onClick={() => handleRedeem("instore")}
                          disabled={!!redeemingInstore || !!(usesRemaining && usesRemaining.number_of_uses_remaining === 0)}
                          className="w-full px-4 py-2.5 bg-nfw-lilac text-nfw-blackberry rounded-xl hover:bg-nfw-lilac/80 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                        >
                          {redeemingInstore ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : usesRemaining && usesRemaining.number_of_uses_remaining === 0 ? (
                            "Offer Limit Reached"
                          ) : (
                            <>
                              <Store className="w-4 h-4" />
                              Redeem In-Store
                            </>
                          )}
                        </button>
                      )}

                      {offer.redemption_methods.includes("instore_print") && (
                        <button
                          onClick={() => handleRedeem("instore_print")}
                          disabled={!!redeemingPrint || !!(usesRemaining && usesRemaining.number_of_uses_remaining === 0)}
                          className="w-full px-4 py-2.5 bg-[#b2d1ee] text-nfw-blackberry rounded-xl hover:bg-[#b2d1ee]/80 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                        >
                          {redeemingPrint ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : usesRemaining && usesRemaining.number_of_uses_remaining === 0 ? (
                            "Offer Limit Reached"
                          ) : (
                            <>
                              <Printer className="w-4 h-4" />
                              Print Coupon
                            </>
                          )}
                        </button>
                      )}

                      {offer.redemption_methods.includes("call") && (
                        <button
                          onClick={() => handleRedeem("call")}
                          disabled={!!redeemingCall || !!(usesRemaining && usesRemaining.number_of_uses_remaining === 0)}
                          className="w-full px-4 py-2.5 bg-nfw-citrine text-nfw-blackberry rounded-xl hover:bg-nfw-citrine/80 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                        >
                          {redeemingCall ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : usesRemaining && usesRemaining.number_of_uses_remaining === 0 ? (
                            "Offer Limit Reached"
                          ) : (
                            <>
                              <Phone className="w-4 h-4" />
                              Redeem by Phone
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
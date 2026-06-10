"use client";

import { useState, useEffect } from "react";
import {
  Gift,
  ExternalLink,
  Phone,
  Copy,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import ExpiredLinkModal from "@/components/ui/ExpiredLinkModal";

interface Redemption {
  id: string;
  offer_key: string;
  offer_title: string;
  store_name: string | null;
  store_logo_url: string | null;
  redeem_type: string;
  coupon_code: string | null;
  phone_number: string | null;
  redemption_url: string | null;
  instructions: string | null;
  status: "active" | "used" | "expired";
  redeemed_at: string;
  expires_at: string | null;
}

export default function RecentRedemptions() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    try {
      const response = await fetch(
        "/api/access-perks/redemptions?status=active&limit=5",
      );

      if (!response.ok) {
        throw new Error("Failed to fetch redemptions");
      }

      const data = await response.json();
      setRedemptions(data.redemptions || []);
    } catch (err: any) {
      console.error("Fetch redemptions error:", err);
      setError(err.message || "Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenFreshUrl = async (redemptionId: string, storedUrl: string | null) => {
    // If stored URL is from static.accessdevelopment.com (coupon page), it doesn't expire - open directly
    if (storedUrl && (storedUrl.includes('static-stage.accessdevelopment.com') || storedUrl.includes('static.accessdevelopment.com'))) {
      window.open(storedUrl, "_blank");
      return;
    }

    // For other URLs (S3 signed URLs that can expire), try fresh-url API
    setOpeningId(redemptionId);
    try {
      const response = await fetch(`/api/access-perks/redemptions/${redemptionId}/fresh-url`);
      const data = await response.json();

      if (response.ok && data.url) {
        window.open(data.url, "_blank");
      } else {
        // API returned error or no URL
        setShowExpiredModal(true);
      }
    } catch {
      setShowExpiredModal(true);
    } finally {
      setOpeningId(null);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (date < new Date()) {
      return `Expired ${formatted}`;
    }
    return `Expires ${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const toLocalDate = (d: Date) => {
      const local = new Date(d);
      local.setMinutes(local.getMinutes() + local.getTimezoneOffset());
      return local;
    };

    const isSameDay = (d1: Date, d2: Date) => {
      const ld1 = toLocalDate(d1);
      const ld2 = toLocalDate(d2);
      return (
        ld1.getFullYear() === ld2.getFullYear() &&
        ld1.getMonth() === ld2.getMonth() &&
        ld1.getDate() === ld2.getDate()
      );
    };

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, now)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    const diffDays = Math.round(
      Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getRedemptionTypeLabel = (type: string) => {
    switch (type) {
      case "link":
        return "Online";
      case "instore":
        return "In-Store";
      case "instore_print":
        return "Print";
      case "call":
        return "Call";
      default:
        return type;
    }
  };

  const getRedemptionTypeColor = (type: string) => {
    switch (type) {
      case "link":
        return "bg-nfw-blackberry text-white";
      case "instore":
        return "bg-nfw-lilac text-nfw-blackberry";
      case "instore_print":
        return "bg-blue-100 text-nfw-blackberry";
      case "call":
        return "bg-nfw-citrine text-nfw-blackberry";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const decodeHtml = (html: string) => {
    if (!html) return "";
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  };

  if (loading) {
    return (
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-nfw-lilac" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-semibold">Error Loading Redemptions</h3>
        </div>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-nfw-blackberry/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nfw-lilac/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-nfw-blackberry" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-nfw-aubergine">
                My Recent Redemptions
              </h2>
              <p className="text-sm text-nfw-blackberry/60">
                Active offers you&apos;ve redeemed
              </p>
            </div>
          </div>
          <Link
            href="/perks/history"
            className="text-sm text-nfw-blackberry hover:text-nfw-blackberry/80 font-medium flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Redemptions List */}
      <div className="divide-y divide-nfw-blackberry/10">
        {redemptions.length === 0 ? (
          <div className="p-8 text-center">
            <Gift className="w-12 h-12 text-nfw-blackberry/20 mx-auto mb-3" />
            <p className="text-nfw-blackberry/60 mb-4">No active redemptions yet</p>
            <Link
              href="/perks"
              className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 transition-colors text-sm font-medium"
            >
              Browse Perks
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="p-4"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {redemption.store_logo_url ? (
                    <img
                      src={redemption.store_logo_url}
                      alt={redemption.store_name || "Store logo"}
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-nfw-blackberry/10"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-nfw-dove border border-nfw-blackberry/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-nfw-blackberry" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Store & Title */}
                  <div className="mb-2">
                    {redemption.store_name && (
                      <p
                        className="text-xs font-semibold text-nfw-blackberry mb-0.5"
                        dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.store_name) }}
                      />
                    )}
                    <h3
                      className="text-sm font-medium text-nfw-blackberry/80 line-clamp-1"
                      dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.offer_title) }}
                    />
                  </div>

                  {/* Type & Date & Expiry */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-xs px-2 py-0.5 font-medium ${getRedemptionTypeColor(redemption.redeem_type)}`}
                    >
                      {getRedemptionTypeLabel(redemption.redeem_type)}
                    </span>
                    <span className="text-xs text-nfw-blackberry/40">
                      {formatDate(redemption.redeemed_at)}
                    </span>
                    {redemption.expires_at && (
                      <span className={`text-xs font-medium ${
                        isExpired(redemption.expires_at)?.startsWith("Expired") ? "text-red-600" : "text-nfw-blackberry/60"
                      }`}>
                        {isExpired(redemption.expires_at)}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {/* Coupon Code */}
                    {redemption.coupon_code && (
                      <button
                        onClick={() =>
                          copyCode(redemption.coupon_code!, redemption.id)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 transition-colors text-xs font-medium"
                      >
                        {copiedId === redemption.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Code: {redemption.coupon_code}
                          </>
                        )}
                      </button>
                    )}

                    {/* Phone Number */}
                    {redemption.phone_number && (
                      <a
                        href={`tel:${redemption.phone_number}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/80 transition-colors text-xs font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        {redemption.phone_number}
                      </a>
                    )}

                    {/* Redemption URL */}
                    {redemption.redemption_url && (
                      <button
                        onClick={() => handleOpenFreshUrl(redemption.id, redemption.redemption_url)}
                        disabled={openingId === redemption.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-lilac/20 text-nfw-blackberry hover:bg-nfw-lilac/30 transition-colors text-xs font-medium disabled:opacity-50"
                      >
                        {openingId === redemption.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3 h-3" />
                            Open Offer
                          </>
                        )}
                      </button>
                    )}

                    {/* View Details */}
                    <Link
                      href={`/perks/${redemption.offer_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-nfw-blackberry hover:bg-gray-200 transition-colors text-xs font-medium"
                    >
                      View Details
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <ExpiredLinkModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />
    </div>
  );
}

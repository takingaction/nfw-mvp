"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Gift,
  ExternalLink,
  Copy,
  Check,
  Phone,
  Loader2,
  Clock,
  ChevronRight,
  ChevronLeft,
  Archive,
} from "lucide-react";
import ExpiredLinkModal from "@/components/ui/ExpiredLinkModal";

interface Redemption {
  id: string;
  offer_key: string;
  offer_title: string;
  store_name: string | null;
  store_logo_url: string | null;
  redeemed_at: string;
  status: string;
  coupon_code: string | null;
  phone_number: string | null;
  redemption_url: string | null;
  expires_at: string | null;
  redeem_type: string | null;
}

interface RedeemedPerksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RedeemedPerksPanel({ isOpen, onClose }: RedeemedPerksPanelProps) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      fetchRedemptions();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(false);
        });
      });
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchRedemptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/access-perks/redemptions?limit=50");
      if (!response.ok) throw new Error("Failed to fetch redemptions");
      const data = await response.json();
      setRedemptions(data.redemptions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.round(
      Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenFreshUrl = async (redemptionId: string, storedUrl: string | null) => {
    // Static URLs don't expire - open directly
    if (storedUrl && (storedUrl.includes('static-stage.accessdevelopment.com') || storedUrl.includes('static.accessdevelopment.com'))) {
      window.open(storedUrl, "_blank");
      return;
    }

    try {
      const response = await fetch(`/api/access-perks/redemptions/${redemptionId}/fresh-url`);
      const data = await response.json();
      
      if (!data.url) {
        setShowExpiredModal(true);
        return;
      }

      // Try HEAD request to check if URL is valid
      let urlValid = false;
      try {
        const headResponse = await fetch(data.url, { method: 'HEAD' });
        urlValid = headResponse.ok;
      } catch (headErr) {
        urlValid = false;
      }

      if (urlValid) {
        window.open(data.url, "_blank");
      } else {
        setShowExpiredModal(true);
      }
    } catch (e) {
      setShowExpiredModal(true);
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
    if (typeof window === "undefined") return html;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html || "";
    return textarea.value;
  };

  if (!isVisible) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isAnimating ? "opacity-0" : "opacity-100"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
          isAnimating ? "translate-x-full" : "translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-nfw-blackberry/10">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-nfw-aubergine" />
              <h2 className="text-lg font-bold text-white font-serif">
                Your Redeemed Perks
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-nfw-lilac" />
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Gift className="w-16 h-16 text-nfw-blackberry/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nfw-blackberry mb-2">
                  No Active Redemptions
                </h3>
                <p className="text-nfw-blackberry/60 text-sm mb-6">
                  When you redeem perks, they&apos;ll appear here.
                </p>
                <Link
                  href="/perks"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 font-medium transition-colors"
                >
                  Browse Perks
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-nfw-blackberry/10">
                {redemptions.map((redemption) => (
                  <div key={redemption.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {redemption.store_logo_url ? (
                        <img
                          src={redemption.store_logo_url}
                          alt=""
                          className="w-12 h-12 object-contain bg-white border border-nfw-blackberry/10"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-nfw-dove border border-nfw-blackberry/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-5 h-5 text-nfw-blackberry/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-nfw-blackberry truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
                            dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.offer_title) }}
                          />
                          {redemption.redeem_type && (
                            <span className={`px-2 py-0.5 text-xs font-medium shrink-0 ${getRedemptionTypeColor(redemption.redeem_type)}`}>
                              {getRedemptionTypeLabel(redemption.redeem_type)}
                            </span>
                          )}
                        </div>
                        {redemption.store_name && (
                          <p className="text-sm text-nfw-blackberry/60 truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
                            dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.store_name) }}
                          />
                        )}
                        <p className="text-xs text-nfw-blackberry/50 mt-1">
                          {formatDate(redemption.redeemed_at)}
                          {isExpired(redemption.expires_at) && (
                            <span className="ml-2 text-red-600">
                              {isExpired(redemption.expires_at)}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {redemption.coupon_code && (
                            <button
                              onClick={() => copyCode(redemption.coupon_code!, redemption.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 transition-colors text-xs font-medium"
                            >
                              <Copy className="w-3 h-3" />
                              {redemption.coupon_code}
                            </button>
                          )}
                          {redemption.phone_number && (
                            <a
                              href={`tel:${redemption.phone_number}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/80 transition-colors text-xs font-medium"
                            >
                              <Phone className="w-3 h-3" />
                              Call
                            </a>
                          )}
                          {redemption.redemption_url && (
                            <button
                              onClick={() => handleOpenFreshUrl(redemption.id, redemption.redemption_url)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-lilac/20 text-nfw-blackberry hover:bg-nfw-lilac/30 transition-colors text-xs font-medium"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </button>
                          )}
                          <Link
                            href={`/perks/${redemption.offer_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-nfw-blackberry hover:bg-gray-200 transition-colors text-xs font-medium"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {redemptions.length > 0 && (
            <div className="p-4 border-t border-nfw-blackberry/10">
              <Link
                href="/perks/history"
                onClick={onClose}
                className="block w-full text-center px-6 py-3 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 font-medium transition-colors"
              >
                View All History
              </Link>
            </div>
          )}
        </div>
      </div>
      <ExpiredLinkModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />
    </>
  );
}
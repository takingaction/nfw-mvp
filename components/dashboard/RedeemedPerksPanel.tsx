"use client";

import { useState, useEffect } from "react";
import {
  X,
  Gift,
  ExternalLink,
  Phone,
  Copy,
  Check,
  Loader2,
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

interface RedeemedPerksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RedeemedPerksPanel({
  isOpen,
  onClose,
}: RedeemedPerksPanelProps) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
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
    // Static URLs don't expire - open directly
    if (storedUrl && (storedUrl.includes('static-stage.accessdevelopment.com') || storedUrl.includes('static.accessdevelopment.com'))) {
      window.open(storedUrl, "_blank");
      return;
    }

    try {
      const response = await fetch(`/api/access-perks/redemptions/${redemptionId}/fresh-url`);
      const data = await response.json();

      if (!response.ok || data.error) {
        window.alert("This link has expired. Please go to Details to redeem again and get a new link.");
      } else if (data.url) {
        window.open(data.url, "_blank");
      } else {
        window.alert("This link has expired. Please go to Details to redeem again and get a new link.");
      }
    } catch {
      window.alert("This link has expired. Please go to Details to redeem again and get a new link.");
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
    const diffDays = Math.round(
      Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
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
    if (typeof window === "undefined") return html;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html || "";
    return textarea.value;
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
            ? isAnimating
              ? "translateX(-100%)"
              : "translateX(0)"
            : "translateX(-100%)",
          transition: "transform 300ms ease-out",
        }}
        className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-hidden"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-nfw-blackberry/10 bg-nfw-aubergine">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-nfw-citrine" />
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
                          alt={redemption.store_name || "Store logo"}
                          className="w-12 h-12 object-contain bg-white border border-nfw-blackberry/10"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-nfw-dove border border-nfw-blackberry/10 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-5 h-5 text-nfw-blackberry" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {redemption.store_name && (
                          <p
                            className="text-xs font-semibold text-nfw-blackberry mb-0.5 truncate"
                            dangerouslySetInnerHTML={{
                              __html: decodeHtml(redemption.store_name),
                            }}
                          />
                        )}
                        <h3
                          className="text-sm font-medium text-nfw-blackberry/80 line-clamp-1"
                          dangerouslySetInnerHTML={{
                            __html: decodeHtml(redemption.offer_title),
                          }}
                        />
                        <div className="flex items-center gap-2 mt-1.5 mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 font-medium ${getRedemptionTypeColor(
                              redemption.redeem_type
                            )}`}
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
                        <div className="flex flex-wrap gap-2">
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
                                  {redemption.coupon_code}
                                </>
                              )}
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
                                  Open
                                </>
                              )}
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

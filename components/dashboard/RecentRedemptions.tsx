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

interface Redemption {
  id: string;
  offer_key: string;
  offer_title: string;
  store_name: string | null;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
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
        return "bg-[#2d1239] text-white";
      case "instore":
        return "bg-[#BCAFCF] text-[#2d1239]";
      case "instore_print":
        return "bg-[#b2d1ee] text-[#2d1239]";
      case "call":
        return "bg-[#d4f1ad] text-[#2d1239]";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#2d1239]/10 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#BCAFCF]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#2d1239]/10 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-semibold">Error Loading Redemptions</h3>
        </div>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#2d1239]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#BCAFCF]/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-[#2d1239]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#2d1239]">
                My Recent Redemptions
              </h2>
              <p className="text-sm text-[#2d1239]/60">
                Active offers you've redeemed
              </p>
            </div>
          </div>
          <Link
            href="/perks/history"
            className="text-sm text-[#2d1239] hover:text-[#2d1239]/80 font-medium flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Redemptions List */}
      <div className="divide-y divide-[#2d1239]/10">
        {redemptions.length === 0 ? (
          <div className="p-8 text-center">
            <Gift className="w-12 h-12 text-[#2d1239]/20 mx-auto mb-3" />
            <p className="text-[#2d1239]/60 mb-4">No active redemptions yet</p>
            <Link
              href="/perks"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors text-sm font-medium"
            >
              Browse Perks
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="p-4 hover:bg-[#f8f7fa] transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-lg bg-[#f8f7fa] border border-[#2d1239]/10 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-[#2d1239]" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Store & Title */}
                  <div className="mb-2">
                    {redemption.store_name && (
                      <p className="text-xs font-semibold text-[#2d1239] mb-0.5">
                        {redemption.store_name}
                      </p>
                    )}
                    <h3 className="text-sm font-medium text-[#2d1239]/80 line-clamp-1">
                      {redemption.offer_title}
                    </h3>
                  </div>

                  {/* Type & Date */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${getRedemptionTypeColor(redemption.redeem_type)}`}
                    >
                      {getRedemptionTypeLabel(redemption.redeem_type)}
                    </span>
                    <span className="text-xs text-[#2d1239]/40">
                      {formatDate(redemption.redeemed_at)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {/* Coupon Code */}
                    {redemption.coupon_code && (
                      <button
                        onClick={() =>
                          copyCode(redemption.coupon_code!, redemption.id)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors text-xs font-medium"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d4f1ad] text-[#2d1239] rounded-lg hover:bg-[#d4f1ad]/80 transition-colors text-xs font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        {redemption.phone_number}
                      </a>
                    )}

                    {/* Redemption URL */}
                    {redemption.redemption_url && (
                      <a
                        href={redemption.redemption_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#BCAFCF]/20 text-[#2d1239] rounded-lg hover:bg-[#BCAFCF]/30 transition-colors text-xs font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Offer
                      </a>
                    )}

                    {/* View Details */}
                    <Link
                      href={`/perks/${redemption.offer_key}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-[#2d1239] rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
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
    </div>
  );
}

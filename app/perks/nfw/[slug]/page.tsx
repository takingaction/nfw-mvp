"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

type NfwPerk = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  partner_name: string | null;
  partner_logo_url: string | null;
  landing_page_url: string | null;
  estimated_value: number | null;
  terms_and_conditions: string | null;
  categories: string[];
  expires_at: string | null;
  userHasRedeemed?: boolean;
};

export default function NfwPerkDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [perk, setPerk] = useState<NfwPerk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPerk();
    }
  }, [slug]);

  const fetchPerk = async () => {
    try {
      // Get user ID from profile API
      const profileRes = await fetch("/api/auth/profile");
      const profileData = await profileRes.json();
      const userId = profileData?.profile?.id;

      const url = userId
        ? `/api/nfw-perks/slug/${encodeURIComponent(slug)}?userId=${userId}`
        : `/api/nfw-perks/slug/${encodeURIComponent(slug)}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Perk not found");
      }

      const data = await res.json();
      setPerk(data);
      if (data.userHasRedeemed) {
        setRedeemed(true);
      }
    } catch (err: any) {
      console.error("Error fetching perk:", err);
      setError(err.message || "Failed to load perk");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!perk?.id || !perk?.landing_page_url) return;

    setRedeeming(true);

    try {
      // Redeem via API
      const res = await fetch(`/api/nfw-perks/${perk.id}/redeem`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to redeem");
      }

      setRedeemed(true);

      // Open landing page
      window.open(perk.landing_page_url, "_blank");
    } catch (err: any) {
      console.error("Redeem error:", err);
      alert(err.message || "Failed to redeem. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  const formatExpiry = (date: string | null) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) return "Expired";
    if (daysUntilExpiry === 0) return "Expires today";
    if (daysUntilExpiry === 1) return "Expires tomorrow";
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    return `Expires ${expiryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-nfw-lilac" />
      </div>
    );
  }

  if (error || !perk) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-nfw-blackberry mb-2">
            Perk Not Found
          </h2>
          <p className="text-nfw-blackberry/60 mb-6">
            {error || "This perk may have expired or been removed."}
          </p>
          <Link
            href="/perks"
            className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Perks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-nfw-blackberry/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/perks"
            className="inline-flex items-center gap-2 text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Perks
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-lg border border-nfw-blackberry/10 bg-nfw-dove overflow-hidden flex items-center justify-center">
                    {perk.partner_logo_url ? (
                      <img
                        src={perk.partner_logo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl opacity-30">🎁</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {perk.partner_name && (
                    <p className="text-sm text-nfw-blackberry/60 mb-1">
                      {perk.partner_name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs bg-nfw-aubergine text-white px-2.5 py-1 rounded-full font-medium uppercase tracking-wide">
                      NFW Exclusive
                    </span>

                    {perk.estimated_value && perk.estimated_value > 0 && (
                      <span className="text-xs bg-nfw-citrine text-nfw-blackberry px-2.5 py-1 rounded-full font-medium">
                        ${perk.estimated_value.toFixed(2)} Value
                      </span>
                    )}

                    {perk.categories && perk.categories.length > 0 && (
                      <>
                        {perk.categories.slice(0, 2).map((cat, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-nfw-dove text-nfw-blackberry/60 px-2.5 py-1 rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                      </>
                    )}
                  </div>

                  {perk.expires_at && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-nfw-blackberry/50">
                      <Clock className="w-3 h-3" />
                      {formatExpiry(perk.expires_at)}
                    </div>
                  )}

                  <button
                    onClick={() => setLiked(!liked)}
                    className="flex items-center gap-1.5 mt-3 text-xs transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 transition-all duration-200 ${
                        liked
                          ? "fill-[#B693C0] text-[#B693C0]"
                          : "fill-[#F8F19A] text-[#F8F19A]"
                      }`}
                    />
                    <span className={liked ? "text-[#B693C0]" : "text-nfw-blackberry/60"}>
                      {liked ? "Saved" : "Save"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
              <h1 className="font-serif text-xl lg:text-2xl text-nfw-blackberry mb-3 leading-tight">
                {perk.title}
              </h1>

              {perk.description && (
                <div className="text-nfw-blackberry/70 text-sm whitespace-pre-wrap">
                  {perk.description}
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            {perk.terms_and_conditions && (
              <div className="bg-nfw-citrine/20 border border-nfw-citrine rounded-xl p-5">
                <h3 className="text-sm font-semibold text-nfw-blackberry mb-2">
                  Terms of Use
                </h3>
                <p className="text-nfw-blackberry/70 text-sm">
                  {perk.terms_and_conditions}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              {/* Redeem Card */}
              <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                <h3 className="text-base font-semibold text-nfw-blackberry mb-4">
                  Redeem This Offer
                </h3>

                {redeemed && (
                  <div className="mb-4 p-3 bg-nfw-citrine/20 border border-nfw-citrine rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-nfw-blackberry">
                          Redeemed!
                        </p>
                        <p className="text-xs text-nfw-blackberry/70 mt-1">
                          You&apos;ve used this perk. Visit the partner site to claim your offer.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRedeem}
                  disabled={!perk.landing_page_url || redeeming}
                  className={`w-full px-4 py-3 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 ${
                    !perk.landing_page_url || redeeming ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      {redeemed ? "Visit Again" : "Redeem Online"}
                    </>
                  )}
                </button>

                {!perk.landing_page_url && (
                  <p className="text-xs text-nfw-blackberry/50 mt-2 text-center">
                    No landing page configured for this perk.
                  </p>
                )}
              </div>

              {/* Perk Info */}
              <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                <h3 className="text-sm font-semibold text-nfw-blackberry mb-3">
                  About This Perk
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-nfw-blackberry/60">Type</span>
                    <span className="text-nfw-blackberry font-medium">NFW Exclusive</span>
                  </div>
                  {perk.estimated_value && perk.estimated_value > 0 && (
                    <div className="flex justify-between">
                      <span className="text-nfw-blackberry/60">Est. Value</span>
                      <span className="text-nfw-blackberry font-medium">
                        ${perk.estimated_value.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {perk.expires_at && (
                    <div className="flex justify-between">
                      <span className="text-nfw-blackberry/60">Expires</span>
                      <span className="text-nfw-blackberry font-medium">
                        {formatExpiry(perk.expires_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

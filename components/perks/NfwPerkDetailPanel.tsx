"use client";

import { useState, useEffect } from "react";
import { X, ArrowLeft, Globe, Heart, Clock } from "lucide-react";

type NfwPerk = {
  id: string;
  title: string;
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

type NfwPerkDetailPanelProps = {
  perk: NfwPerk | null;
  isOpen: boolean;
  onClose: () => void;
  onRedeem?: (perk: NfwPerk) => void;
  liked?: boolean;
  onToggleLike?: (partnerName: string, logoUrl: string | null, liked: boolean) => void;
};

function formatExpiry(date: string | null): string {
  if (!date) return "";
  const expiryDate = new Date(date);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) return "Expired";
  if (daysUntilExpiry === 0) return "Expires today";
  if (daysUntilExpiry === 1) return "Expires tomorrow";
  if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
  return `Expires ${expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export default function NfwPerkDetailPanel({
  perk,
  isOpen,
  onClose,
  onRedeem,
  liked = false,
  onToggleLike,
}: NfwPerkDetailPanelProps) {
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
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

  const handleToggleLike = () => {
    setLikeAnimating(true);
    const partnerName = perk?.partner_name || "";
    const logoUrl = perk?.partner_logo_url || null;
    const newLiked = !liked;
    onToggleLike?.(partnerName, logoUrl, newLiked);
    setTimeout(() => setLikeAnimating(false), 300);
  };

  if (!isVisible || !perk) return null;

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

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="bg-white rounded-xl border border-nfw-blackberry/10 p-5">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg border border-nfw-blackberry/10 bg-nfw-dove overflow-hidden flex items-center justify-center">
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

                      {perk.categories && perk.categories.slice(0, 2).map((cat, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-nfw-dove text-nfw-blackberry/60 px-2.5 py-1 rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {perk.expires_at && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-nfw-blackberry/50">
                        <Clock className="w-3 h-3" />
                        {formatExpiry(perk.expires_at)}
                      </div>
                    )}

                    <button
                      onClick={handleToggleLike}
                      className="flex items-center gap-1.5 mt-3 text-xs transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 transition-all duration-200 ${
                          liked
                            ? "fill-[#B693C0] text-[#B693C0]"
                            : "fill-[#F8F19A] text-[#F8F19A]"
                        } ${likeAnimating ? "scale-125" : "scale-100"}`}
                      />
                      <span className={liked ? "text-[#B693C0]" : "text-nfw-blackberry/60"}>
                        {liked ? "Saved" : "Save"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

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

              {perk.terms_and_conditions && (
                <div className="bg-nfw-citrine/20 border border-nfw-citrine rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-nfw-blackberry mb-2">Terms of Use</h3>
                  <p className="text-nfw-blackberry/70 text-sm">
                    {perk.terms_and_conditions}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-nfw-blackberry/10 bg-white">
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (!perk.landing_page_url) return;
                  
                  // If already redeemed, just open URL directly without API call
                  if (perk.userHasRedeemed) {
                    window.open(perk.landing_page_url, "_blank");
                    return;
                  }
                  
                  // Not yet redeemed - call the redeem handler
                  if (!redeeming) {
                    setRedeeming(true);
                    onRedeem?.(perk);
                  }
                }}
                disabled={!perk.landing_page_url || redeeming}
                className={`w-full px-4 py-2.5 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm ${
                  !perk.landing_page_url || redeeming ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {redeeming ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Redirecting...
                  </>
                ) : perk.userHasRedeemed ? (
                  <>
                    <Globe className="w-4 h-4" />
                    View Again
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    Redeem Online
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

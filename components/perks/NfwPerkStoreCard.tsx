"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Heart } from "lucide-react";

interface NfwPerkStoreCardProps {
  partner: {
    partner_name: string;
    partner_logo_url: string | null;
  };
  liked?: boolean;
  onToggleLike?: (partnerName: string, logoUrl: string | null, liked: boolean) => void;
  onClick?: () => void;
  showLikeButton?: boolean;
}

export default function NfwPerkStoreCard({
  partner,
  liked = false,
  onToggleLike,
  onClick,
  showLikeButton = true,
}: NfwPerkStoreCardProps) {
  const [isLiked, setIsLiked] = useState(liked);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsLiked(liked);
  }, [liked]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    if (onToggleLike) {
      onToggleLike(partner.partner_name, partner.partner_logo_url, newLiked);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-nfw-blackberry/10 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
    >
      {showLikeButton && onToggleLike && (
        <button
          onClick={handleLikeClick}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-nfw-blackberry/5 transition-colors z-10"
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-200 ${
              isLiked
                ? "fill-[#B693C0] text-[#B693C0]"
                : "fill-[#F8F19A] text-[#F8F19A]"
            } ${isAnimating ? "scale-125" : "scale-100"}`}
          />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 flex-shrink-0 bg-nfw-dove rounded overflow-hidden">
          {partner.partner_logo_url ? (
            <img
              src={partner.partner_logo_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-nfw-blackberry/30 text-xs">
              No Logo
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-sans text-sm font-semibold text-nfw-blackberry truncate">
            {partner.partner_name}
          </h3>
          <div className="flex items-center gap-0.5 mt-1">
            <span className="flex items-center gap-0.5 text-nfw-aubergine text-xs font-medium">
              View Offers
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

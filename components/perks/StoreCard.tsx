"use client";

import { useEffect, useState } from "react";
import { Navigation, ChevronRight, Heart } from "lucide-react";

interface StoreCardProps {
  store: {
    key: number;
    name: string;
    logo_url?: string;
    description?: string;
    count: number;
    offers: string[];
    location?: {
      city_locality?: string;
      state_region?: string;
    };
    distance?: number;
  };
  onClick?: () => void;
  isNationwide?: boolean;
  liked?: boolean;
  onToggleLike?: (storeKey: number, storeName: string, logoUrl: string | undefined, liked: boolean) => void;
  showLikeButton?: boolean;
}

function decodeHTML(html: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

export default function StoreCard({
  store,
  onClick,
  isNationwide,
  liked = false,
  onToggleLike,
  showLikeButton = true,
}: StoreCardProps) {
  const [isLiked, setIsLiked] = useState(liked);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsLiked(liked);
  }, [liked]);

  const displayName = store.name ? decodeHTML(store.name) : store.name;

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    onToggleLike?.(store.key, store.name, store.logo_url, newLiked);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-nfw-blackberry/10 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
    >
      {showLikeButton && (
        <button
          onClick={handleLikeClick}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-nfw-blackberry/5 transition-colors z-10"
          aria-label={isLiked ? "Unlike store" : "Like store"}
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
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt=""
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-nfw-blackberry/30 text-xs">
              No Logo
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3
            className="font-sans text-sm font-semibold text-nfw-blackberry truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
            dangerouslySetInnerHTML={{ __html: displayName }}
          />
          <div className="flex items-center gap-2 mt-1">
            {!isNationwide && store.distance !== undefined && store.distance < 5000 && (
              <span className="flex items-center gap-0.5 text-nfw-blackberry/50 text-xs">
                <Navigation className="w-3 h-3" />
                {store.distance.toFixed(1)} mi
              </span>
            )}
            {!isNationwide && (store.distance === undefined || store.distance >= 5000) && (
              <span className="flex items-center gap-0.5 text-nfw-aubergine text-xs font-medium">
                ONLINE
              </span>
            )}
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

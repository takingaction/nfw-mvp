"use client";

import { MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

interface OfferCardProps {
  offer: any;
}

export default function OfferCard({ offer }: OfferCardProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const storeNameRef = useRef<HTMLDivElement>(null);

  const {
    offer_key,
    title,
    savings_amount,
    logo_url,
    offer_photo_url,
    expires_on,
    offer_store,
    physical_location,
    search_distance,
    redemption_methods,
    categories,
  } = offer;

  useEffect(() => {
    if (titleRef.current && title) {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = title;
      titleRef.current.innerHTML = textarea.value;
    }

    if (storeNameRef.current && offer_store?.name) {
      const textarea = document.createElement("textarea");
      textarea.innerHTML = offer_store.name;
      storeNameRef.current.innerHTML = textarea.value;
    }
  }, [title, offer_store?.name]);

  const formatDistance = (distance: number) => {
    if (!distance) return null;
    return `${distance.toFixed(1)} mi`;
  };

  const formatExpiry = (date: string) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) return "Expired";
    if (daysUntilExpiry === 0) return "Today";
    if (daysUntilExpiry === 1) return "Tomorrow";
    if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days`;
    return expiryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const imageUrl = offer_photo_url || logo_url;

  return (
    <Link href={`/perks/${offer_key}`} className="block h-full">
      <div className="bg-white border border-nfw-blackberry/10 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col">
        <div className="flex p-4 gap-4 flex-1">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 border border-nfw-blackberry/10 bg-nfw-dove overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-2xl opacity-30">🎁</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            {offer_store?.name && (
              <div
                ref={storeNameRef}
                className="text-sm font-semibold text-nfw-blackberry mb-1 break-words [&_sup]:text-[0.6em] [&_sup]:align-super"
              >
                {offer_store.name}
              </div>
            )}

            <h3
              ref={titleRef}
              className="text-nfw-blackberry/70 text-sm mb-2 line-clamp-2 leading-tight flex-1 [&_sup]:text-[0.6em] [&_sup]:align-super"
            >
              {title}
            </h3>

            {/* Savings & Category Tags Row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {savings_amount && (
                <span className="text-xs bg-nfw-citrine text-nfw-blackberry px-2 py-0.5 font-medium">
                  {savings_amount}
                </span>
              )}

              {categories &&
                categories.slice(0, 1).map((cat: any) => (
                  <span
                    key={cat.category_key}
                    className="text-xs bg-nfw-dove text-nfw-blackberry/60 px-2 py-0.5"
                  >
                    {cat.category_name}
                  </span>
                ))}
            </div>

            {/* Redemption Type Row - Distinct Style */}
            {redemption_methods && redemption_methods.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {redemption_methods.includes("link") && (
                  <span className="text-xs bg-nfw-blackberry text-white px-2.5 py-0.5 font-medium">
                    Online
                  </span>
                )}
                {(redemption_methods.includes("instore") ||
                  redemption_methods.includes("instore_print")) && (
                  <span className="text-xs bg-nfw-blackberry text-white px-2.5 py-0.5 font-medium">
                    In-Store
                  </span>
                )}
                {redemption_methods.includes("call") && (
                  <span className="text-xs bg-nfw-blackberry text-white px-2.5 py-0.5 font-medium">
                    Call
                  </span>
                )}
              </div>
            )}

            {/* Bottom Row - Location & Expiry */}
            <div className="flex items-center gap-3 text-xs text-nfw-blackberry/40 mt-auto">
              {physical_location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {physical_location.city_locality}
                  {search_distance && ` · ${formatDistance(search_distance)}`}
                </span>
              )}

              {expires_on && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatExpiry(expires_on)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

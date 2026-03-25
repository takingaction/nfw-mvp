"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MapPin, Navigation } from "lucide-react";

interface LocationCardProps {
  location: {
    key: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    distance?: number;
    count: number;
    offers: string[];
    store?: {
      name?: string;
      logo_url?: string;
    };
  };
  onClick?: () => void;
}

function decodeHTML(html: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

export default function LocationCard({ location, onClick }: LocationCardProps) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const storeNameRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (nameRef.current && location.name) {
      nameRef.current.innerHTML = decodeHTML(location.name);
    }
    if (storeNameRef.current && location.store?.name) {
      storeNameRef.current.innerHTML = decodeHTML(location.store.name);
    }
  }, [location.name, location.store?.name]);

  const fullAddress = [location.address, location.city, location.state]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      onClick={onClick}
      className="bg-white border border-nfw-blackberry/10 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 flex-shrink-0 relative bg-nfw-dove rounded overflow-hidden">
          {location.store?.logo_url ? (
            <Image
              src={location.store.logo_url}
              alt=""
              fill
              className="object-contain p-1"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-nfw-blackberry/30">
              <MapPin className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            ref={nameRef}
            className="font-sans text-sm font-semibold text-nfw-blackberry truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
          >
            {location.name}
          </h3>
          {location.store?.name && (
            <p
              ref={storeNameRef}
              className="text-xs text-nfw-blackberry/50 truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
            >
              {location.store.name}
            </p>
          )}
          {fullAddress && (
            <p className="text-xs text-nfw-blackberry/50 truncate">{fullAddress}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="px-2 py-0.5 bg-nfw-lilac/20 text-nfw-aubergine text-xs font-medium">
            {location.count} {location.count === 1 ? "offer" : "offers"}
          </span>
          {location.distance && (
            <span className="flex items-center gap-0.5 text-nfw-blackberry/50 text-xs">
              <Navigation className="w-3 h-3" />
              {location.distance.toFixed(1)} mi
            </span>
          )}
        </div>
      </div>

      {location.offers.length > 0 && (
        <div className="space-y-1">
          {location.offers.slice(0, 2).map((offer, index) => (
            <p
              key={index}
              className="text-xs text-nfw-blackberry/70 truncate"
            >
              • {offer}
            </p>
          ))}
          {location.offers.length > 2 && (
            <p className="text-xs text-nfw-blackberry/50">
              +{location.offers.length - 2} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

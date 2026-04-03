"use client";

import { useEffect, useRef } from "react";
import { Navigation, ChevronRight } from "lucide-react";

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
}

function decodeHTML(html: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

export default function StoreCard({ store, onClick }: StoreCardProps) {
  const nameRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (nameRef.current && store.name) {
      nameRef.current.innerHTML = decodeHTML(store.name);
    }
  }, [store.name]);

  return (
    <div
      onClick={onClick}
      className="bg-white border border-nfw-blackberry/10 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
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
        <div className="flex-1 min-w-0">
          <h3
            ref={nameRef}
            className="font-sans text-sm font-semibold text-nfw-blackberry truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
          >
            {store.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {store.distance !== undefined && (
              <span className="flex items-center gap-0.5 text-nfw-blackberry/50 text-xs">
                <Navigation className="w-3 h-3" />
                {store.distance.toFixed(1)} mi
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
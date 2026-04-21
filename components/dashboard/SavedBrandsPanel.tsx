"use client";

import { useState, useEffect } from "react";
import { X, Heart, Loader2 } from "lucide-react";
import Link from "next/link";

interface LikedStore {
  id: string;
  store_key: string;
  store_name: string;
  logo_url: string | null;
  created_at: string;
}

interface SavedBrandsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stores: LikedStore[];
  onUnlike: (storeKey: string) => void;
}

export default function SavedBrandsPanel({
  isOpen,
  onClose,
  stores,
  onUnlike,
}: SavedBrandsPanelProps) {
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
              <Heart className="w-5 h-5 text-nfw-citrine" />
              <h2 className="text-lg font-bold text-white font-serif">
                Your Saved Brands
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {stores.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-nfw-blackberry/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nfw-blackberry mb-2">
                  No Saved Brands Yet
                </h3>
                <p className="text-nfw-blackberry/60 text-sm mb-6">
                  When you find a store you love, tap the heart icon to save it
                  here.
                </p>
                <Link
                  href="/perks"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 font-medium transition-colors"
                >
                  Browse Perks
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 p-3 bg-nfw-dove/50 rounded-xl"
                  >
                    <div className="w-14 h-14 bg-white rounded-lg border border-nfw-blackberry/10 flex items-center justify-center flex-shrink-0">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt=""
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <Heart className="w-6 h-6 text-nfw-blackberry/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold text-nfw-blackberry truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
                        dangerouslySetInnerHTML={{
                          __html: decodeHtml(store.store_name),
                        }}
                      />
                      <Link
                        href={`/perks?store=${store.store_key}`}
                        onClick={onClose}
                        className="text-sm text-nfw-aubergine hover:underline"
                      >
                        View Offers
                      </Link>
                    </div>
                    <button
                      onClick={() => onUnlike(store.store_key)}
                      className="p-2 hover:bg-nfw-blackberry/5 rounded-lg transition-colors"
                      aria-label="Remove from saved"
                    >
                      <Heart className="w-5 h-5 fill-[#B693C0] text-[#B693C0]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {stores.length > 0 && (
            <div className="p-4 border-t border-nfw-blackberry/10">
              <Link
                href="/perks"
                onClick={onClose}
                className="block w-full text-center px-6 py-3 bg-nfw-blackberry text-white rounded-xl hover:bg-nfw-blackberry/90 font-medium transition-colors"
              >
                Browse More Perks
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

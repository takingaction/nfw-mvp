"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Popup {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  mobile_label: string | null;
  frequency_type: string;
  frequency_value: number;
  delay_seconds: number;
}

interface PromotionalPopupProps {
  path: string;
}

export default function PromotionalPopup({ path }: PromotionalPopupProps) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const fetchPopups = async () => {
      try {
        const res = await fetch(`/api/promotional-popups?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        if (data.popups && data.popups.length > 0) {
          const eligible = data.popups.filter((popup: Popup) => {
            return !isDismissed(popup);
          });
          if (eligible.length > 0) {
            setPopups(eligible);
            setCurrentPopup(eligible[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching popups:", error);
      }
    };
    fetchPopups();
  }, [path]);

  useEffect(() => {
    if (currentPopup && popups.length > 0) {
      const timer = setTimeout(() => {
        setShowPopup(true);
        setAnimKey(prev => prev + 1);
      }, currentPopup.delay_seconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPopup, popups]);

  const isDismissed = (popup: Popup): boolean => {
    if (typeof window === "undefined") return false;

    const key = `popup_dismissed_${popup.id}`;
    const stored = localStorage.getItem(key);
    if (!stored) return false;

    try {
      const data = JSON.parse(stored);

      switch (popup.frequency_type) {
        case "once":
          return data.dismissed === true;
        case "per_session":
          return data.sessionDismissed === true;
        case "daily":
          if (data.frequency_type !== "daily") return false;
          if (data.date !== new Date().toDateString()) return false;
          return data.dismissedAt === "daily";
        case "weekly":
          if (data.frequency_type !== "weekly") return false;
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (new Date(data.dismissedAt) < weekAgo) return false;
          return true;
        case "limited":
          if (data.frequency_type !== "limited") return false;
          return data.count >= (popup.frequency_value || 1);
        default:
          return false;
      }
    } catch {
      return false;
    }
  };

  const dismiss = (popup: Popup) => {
    const key = `popup_dismissed_${popup.id}`;
    const now = new Date().toISOString();

    switch (popup.frequency_type) {
      case "once":
        localStorage.setItem(key, JSON.stringify({ dismissed: true }));
        break;
      case "per_session":
        sessionStorage.setItem(key, JSON.stringify({ sessionDismissed: true }));
        break;
      case "daily":
        localStorage.setItem(
          key,
          JSON.stringify({
            frequency_type: "daily",
            date: new Date().toDateString(),
            dismissedAt: "daily",
          })
        );
        break;
      case "weekly":
        localStorage.setItem(
          key,
          JSON.stringify({
            frequency_type: "weekly",
            dismissedAt: now,
          })
        );
        break;
      case "limited":
        const stored = localStorage.getItem(key);
        const data = stored ? JSON.parse(stored) : { count: 0 };
        localStorage.setItem(
          key,
          JSON.stringify({
            ...data,
            frequency_type: "limited",
            count: (data.count || 0) + 1,
          })
        );
        break;
      case "every_visit":
        break;
    }

    setShowPopup(false);
    setDismissed(true);

    setTimeout(() => {
      const remaining = popups.filter((p) => p.id !== popup.id);
      setPopups(remaining);
      if (remaining.length > 0) {
        setCurrentPopup(remaining[0]);
        setDismissed(false);
      } else {
        setCurrentPopup(null);
      }
    }, 300);
  };

  const handleClose = () => {
    if (currentPopup) {
      dismiss(currentPopup);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!currentPopup || dismissed) return null;

return (
    <>
      <div
        key={animKey}
        className="fixed inset-0 z-50"
        style={{ pointerEvents: showPopup ? "auto" : "none" }}
        onClick={handleOverlayClick}
      >
        <div className={`absolute inset-0 bg-black/50 ${showPopup ? "animate-popup-fade" : ""}`} />

        {isMobile ? (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl ${showPopup ? "animate-popup-fade" : ""}`}
          >
            <div className="p-4 flex justify-between items-center border-b border-nfw-blackberry/10">
              <span className="font-sans text-sm text-nfw-blackberry/60">
                {currentPopup.mobile_label || "Special Offer"}
              </span>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-nfw-blackberry/10 rounded-full"
              >
                <X size={20} className="text-nfw-blackberry" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-serif text-xl font-bold text-nfw-blackberry mb-2">
                {currentPopup.title}
              </h3>
              {currentPopup.body && (
                <p className="font-sans text-nfw-blackberry/80 text-sm mb-4 whitespace-pre-wrap">
                  {currentPopup.body}
                </p>
              )}
              {currentPopup.cta_text && currentPopup.cta_url && (
                <a
                  href={currentPopup.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-nfw-citrine text-nfw-blackberry px-6 py-2 font-ui font-medium text-sm hover:bg-nfw-citrine/80 transition-colors"
                >
                  {currentPopup.cta_text}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className={`bg-white rounded-lg shadow-2xl max-w-3xl w-full ${showPopup ? "animate-popup-fade" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row items-stretch">
                <div className="w-full md:w-1/2 flex-shrink-0 relative">
                  <div className="absolute inset-0 overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-r-none">
                    {currentPopup.image_url ? (
                      <img
                        src={currentPopup.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-nfw-blackberry/10" />
                    )}
                  </div>
                </div>
                <div className="w-full md:w-1/2 bg-white p-8 relative">
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-1 hover:bg-nfw-blackberry/10 rounded-full"
                  >
                    <X size={20} className="text-nfw-blackberry" />
                  </button>
                  <div className="pt-4 pb-8">
                    <h3 className="font-serif text-2xl md:text-3xl font-bold text-nfw-blackberry mb-4">
                      {currentPopup.title}
                    </h3>
                    {currentPopup.body && (
                      <p className="font-sans text-nfw-blackberry/80 text-base mb-6 whitespace-pre-wrap leading-relaxed">
                        {currentPopup.body}
                      </p>
                    )}
                    {currentPopup.cta_text && currentPopup.cta_url && (
                      <a
                        href={currentPopup.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-nfw-citrine text-nfw-blackberry px-8 py-4 font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
                      >
                        {currentPopup.cta_text}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

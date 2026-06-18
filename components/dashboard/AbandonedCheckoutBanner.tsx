"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type AbandonedCheckout = {
  hasAbandoned: boolean;
  membershipLevel?: string;
  checkoutUrl?: string;
  createdAt?: string;
};

export function AbandonedCheckoutBanner() {
  const [abandoned, setAbandoned] = useState<AbandonedCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this banner (stored in localStorage)
    const isDismissed = localStorage.getItem("abandoned_checkout_dismissed");
    if (isDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Fetch abandoned checkout status
    fetch("/api/checkout/abandoned")
      .then((res) => res.json())
      .then((data) => {
        setAbandoned(data);
        if (!data.hasAbandoned) {
          setDismissed(true);
        }
      })
      .catch((err) => {
        console.error("[AbandonedCheckoutBanner] Error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("abandoned_checkout_dismissed", "true");
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      const res = await fetch("/api/checkout/resume", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to resume checkout");
        setResuming(false);
      }
    } catch (err) {
      console.error("[AbandonedCheckoutBanner] Resume error:", err);
      setResuming(false);
    }
  };

  if (loading || dismissed || !abandoned?.hasAbandoned) {
    return null;
  }

  return (
    <div className="w-full bg-nfw-citrine py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-nfw-blackberry font-ui text-sm font-medium flex-1">
          You have an incomplete membership purchase. Complete it now →
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleResume}
            disabled={resuming}
            className="bg-nfw-blackberry text-white px-4 py-1.5 rounded text-sm font-ui font-medium hover:bg-nfw-blackberry/90 transition-colors disabled:opacity-50"
          >
            {resuming ? "Loading..." : "Resume Checkout"}
          </button>
          <button
            onClick={handleDismiss}
            className="text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface PendingFreeMembershipBannerProps {
  isDismissed?: boolean;
}

export function PendingFreeMembershipBanner({ isDismissed = false }: PendingFreeMembershipBannerProps) {
  const [dismissed, setDismissed] = useState(isDismissed);

  const handleDismiss = () => {
    setDismissed(true);
    // Optionally persist dismissal in localStorage
    // localStorage.setItem("pending_free_membership_dismissed", "true");
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="w-full bg-nfw-wisteria py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-white font-ui text-sm font-medium flex-1">
          Your free membership request is pending review. You&apos;ll receive an email once our team approves your application.
        </p>
        <button
          onClick={handleDismiss}
          className="text-white/60 hover:text-white transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

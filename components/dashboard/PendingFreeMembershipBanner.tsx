"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface PendingFreeMembershipBannerProps {
  isDismissed?: boolean;
  membershipLevel?: string;
}

export function PendingFreeMembershipBanner({ isDismissed = false, membershipLevel }: PendingFreeMembershipBannerProps) {
  const [dismissed, setDismissed] = useState(isDismissed);

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  const isWaitlist = membershipLevel === "waitlist";

  return (
    <div className="w-full bg-nfw-wisteria py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-white font-ui text-sm font-medium flex-1">
          {isWaitlist ? (
            <>
              You're on the free membership waitlist. We'll email you when a spot opens up. You can also upgrade at any time{" "}
              <Link
                href="/auth/sign-up?step=3"
                className="text-white font-bold underline hover:text-nfw-citrine transition-colors"
              >
                here
              </Link>
              .
            </>
          ) : (
            "Your free membership request is pending review. You'll receive an email once our team approves your application."
          )}
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

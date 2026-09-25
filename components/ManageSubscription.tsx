"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function ManageSubscription({
  membershipLevel,
}: {
  membershipLevel: string;
}) {
  // Separate flags so each button spins independently when both are shown
  // (contributing members see Upgrade + Manage Subscription).
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const anyLoading = upgradeLoading || portalLoading;

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    setError("");

    try {
      const response = await fetch("/api/membership/upgrade", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to upgrade");
        setUpgradeLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upgrade");
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError("");

    try {
      const response = await fetch("/api/portal", { method: "POST" });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Failed to open subscription portal");
      setPortalLoading(false);
    }
  };

  const manageSubscriptionButton = (
    <button
      onClick={handleManageSubscription}
      disabled={anyLoading}
      className="bg-nfw-dove text-nfw-blackberry px-4 py-2 hover:bg-nfw-lilac/20 disabled:opacity-50 font-medium transition-colors border border-nfw-blackberry/10 flex items-center gap-2"
    >
      {portalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {portalLoading ? "Loading..." : "Manage Subscription"}
    </button>
  );

  // Free/Waitlist: go to step 3
  if (membershipLevel === "free" || membershipLevel === "waitlist") {
    return (
      <a
        href="/auth/sign-up?step=3"
        className="inline-block bg-nfw-blackberry text-white px-4 py-2 hover:bg-nfw-blackberry/90 font-medium transition-colors"
      >
        Upgrade Today
      </a>
    );
  }

  // Contributing: prorated upgrade option + access to the billing portal
  if (membershipLevel === "contributing") {
    return (
      <div>
        <div className="flex flex-col items-start gap-2">
          <button
            onClick={handleUpgrade}
            disabled={anyLoading}
            className="bg-nfw-aubergine text-white px-4 py-2 hover:bg-nfw-aubergine/90 disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
          >
            {upgradeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {upgradeLoading ? "Upgrading..." : "Upgrade to Founding - $85"}
          </button>
          {manageSubscriptionButton}
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Founding: show manage subscription
  return (
    <div>
      {manageSubscriptionButton}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

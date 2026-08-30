"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function ManageSubscription({
  membershipLevel,
}: {
  membershipLevel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/membership/upgrade", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message || `Congratulations! You've upgraded to Founding Member. Amount charged: $${(data.amountCharged || 85).toFixed(2)}`);
        window.location.reload();
      } else {
        setError(data.error || "Failed to upgrade");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upgrade");
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

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

  // Contributing: show prorated upgrade option
  if (membershipLevel === "contributing") {
    return (
      <div>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-nfw-aubergine text-white px-4 py-2 hover:bg-nfw-aubergine/90 disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Upgrading..." : "Upgrade to Founding - $85"}
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Founding: show manage subscription
  return (
    <div>
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="bg-nfw-dove text-nfw-blackberry px-4 py-2 hover:bg-nfw-lilac/20 disabled:opacity-50 font-medium transition-colors border border-nfw-blackberry/10 flex items-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Loading..." : "Manage Subscription"}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

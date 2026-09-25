"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { NotificationModal } from "@/components/admin/NotificationModal";

const VIEW_AS_BLOCKED_CODE = "WRITE_BLOCKED_WHILE_VIEWING_AS";
const VIEW_AS_BLOCKED_MESSAGE =
  "Writes are blocked while viewing as another member. Please exit preview first.";

type Notice = {
  title: string;
  message: string;
  variant: "info" | "error";
};

export default function ManageSubscription({
  membershipLevel,
}: {
  membershipLevel: string;
}) {
  // Separate flags so each button spins independently when both are shown
  // (contributing members see Upgrade + Manage Subscription).
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  // Errors are shown in a modal (not inline) so the Membership Status row
  // layout never shifts.
  const [notice, setNotice] = useState<Notice | null>(null);

  const anyLoading = upgradeLoading || portalLoading;

  const showFailure = (data: { error?: string; code?: string } | null, fallback: string) => {
    if (data?.code === VIEW_AS_BLOCKED_CODE) {
      setNotice({ title: "Preview Mode", message: VIEW_AS_BLOCKED_MESSAGE, variant: "info" });
    } else {
      setNotice({
        title: "Something went wrong",
        message: data?.error || fallback,
        variant: "error",
      });
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);

    try {
      const response = await fetch("/api/membership/upgrade", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (data?.success && data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return;
      }
      showFailure(data, "Failed to upgrade. Please try again.");
    } catch {
      showFailure(null, "Failed to upgrade. Please try again.");
    }
    setUpgradeLoading(false);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);

    try {
      const response = await fetch("/api/portal", { method: "POST" });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      showFailure(data, "Failed to open subscription portal. Please try again.");
    } catch {
      showFailure(null, "Failed to open subscription portal. Please try again.");
    }
    setPortalLoading(false);
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

  const noticeModal = (
    <NotificationModal
      isOpen={notice !== null}
      onClose={() => setNotice(null)}
      title={notice?.title ?? ""}
      message={notice?.message ?? ""}
      variant={notice?.variant ?? "info"}
    />
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
      <>
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
        {noticeModal}
      </>
    );
  }

  // Founding: show manage subscription
  return (
    <>
      {manageSubscriptionButton}
      {noticeModal}
    </>
  );
}

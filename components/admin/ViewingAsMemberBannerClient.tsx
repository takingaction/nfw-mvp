/**
 * Persistent banner shown at the top of every page when an admin is using
 * "View as Member" (cookie-based; nfw_view_as cookie).
 *
 * Mounted once in app/layout.tsx so it persists across all internal
 * navigations without the user having to re-trigger it. Calls the stop
 * endpoint on click, which clears the cookie.
 *
 * Visual: red background, z-index 60 (sits above the aubergine nav at
 * z-50, including dropdown overflows).
 */
"use client";

import { useState } from "react";

interface Props {
  targetUserName: string | null;
  targetUserEmail: string;
  initialPage: string; // the page the admin started viewing
}

export default function ViewingAsMemberBannerClient({
  targetUserName,
  targetUserEmail,
  initialPage,
}: Props) {
  const displayName = targetUserName?.trim() || targetUserEmail;
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      const res = await fetch("/api/admin/view-as/stop", {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.ok) {
        // Hard reload to the initial page so the view_as context is gone.
        window.location.href = initialPage;
      } else {
        setStopping(false);
      }
    } catch {
      setStopping(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="viewing-as-banner"
      className="w-full bg-red-600 border-b-2 border-white text-white px-4 py-2 flex items-center justify-between gap-3 text-sm z-[60]"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="font-ui font-semibold truncate">
          VIEWING AS{" "}
          <span className="font-black">{displayName}</span>
          {targetUserName?.trim() && (
            <span className="text-white/80 ml-1 hidden sm:inline">
              ({targetUserEmail})
            </span>
          )}
        </div>
        <span className="text-white/70 hidden sm:inline">·</span>
        <span className="text-white/80 hidden sm:inline">
          Writes are blocked.
        </span>
      </div>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="px-3 py-1.5 bg-white text-red-600 font-ui text-xs uppercase tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
      >
        {stopping ? "Stopping..." : "Exit Preview"}
      </button>
    </div>
  );
}

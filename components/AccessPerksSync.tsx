"use client";

import { useEffect } from "react";

export default function AccessPerksSync({
  userId,
}: {
  userId: string;
}) {
  useEffect(() => {
    const sync = async () => {
      try {
        await fetch("/api/access-perks/sync-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch (err) {
        console.error("[AccessPerksSync] Unexpected error:", err);
      }
    };

    sync();
  }, [userId]);

  return null;
}

"use client";

import { useEffect } from "react";

export default function AccessPerksSync({
  userId,
}: {
  userId: string;
}) {
  useEffect(() => {
    const sync = async () => {
      console.log("[AccessPerksSync] Starting sync for userId:", userId);
      
      try {
        const response = await fetch("/api/access-perks/sync-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        
        const result = await response.json();
        console.log("[AccessPerksSync] Sync result:", result);
        
        if (result.success) {
          console.log("Access Perks member synced successfully");
        } else if (result.error) {
          console.error("[AccessPerksSync] Sync failed:", result.error);
        }
      } catch (err) {
        console.error("[AccessPerksSync] Unexpected error:", err);
      }
    };

    sync();
  }, [userId]);

  return null;
}

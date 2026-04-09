"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkAndSyncAccessMember } from "@/lib/access-perks/member-sync";

export default function AccessPerksSync({
  userId,
}: {
  userId: string;
}) {
  useEffect(() => {
    const sync = async () => {
      const supabase = createClient();
      console.log("[AccessPerksSync] Starting sync for userId:", userId);
      
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      console.log("[AccessPerksSync] Auth user:", user?.id, user?.email);

      if (user?.email) {
        console.log("[AccessPerksSync] Calling checkAndSyncAccessMember...");
        const result = await checkAndSyncAccessMember(
          supabase,
          userId,
          user.email,
        );
        console.log("[AccessPerksSync] Sync result:", result);
        if (result.synced) {
          console.log("Access Perks member synced successfully");
        } else if (result.error) {
          console.error("[AccessPerksSync] Sync failed:", result.error);
        }
      } else {
        console.log("[AccessPerksSync] No user email found, skipping sync");
      }
    };

    sync().catch((err) => {
      console.error("[AccessPerksSync] Unexpected error:", err);
    });
  }, [userId]);

  return null;
}

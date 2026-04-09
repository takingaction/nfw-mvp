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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const result = await checkAndSyncAccessMember(
          supabase,
          userId,
          user.email,
        );
        if (result.synced) {
          console.log("Access Perks member synced successfully");
        }
      }
    };

    sync().catch((err) => {
      console.error("Access Perks sync error:", err);
    });
  }, [userId]);

  return null;
}

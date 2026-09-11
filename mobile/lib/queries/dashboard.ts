import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queries/keys";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import type { DashboardSettings, Savings } from "@/types/dashboard";

/** Single-row CMS config for the dashboard. SELECT is public. */
export function useDashboardSettings() {
  return useQuery({
    queryKey: queryKeys.dashboardSettings,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DashboardSettings | null> => {
      const { data, error } = await supabase.from("dashboard_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data as DashboardSettings) ?? null;
    },
  });
}

/**
 * "Your Membership at Work" totals — mirrors getSavings() in app/dashboard/page.tsx,
 * computed on-device from tables the member can read under RLS:
 *   microgrants : grants.amount_approved where status = payment_sent
 *   perks       : Σ offer_redemptions.offer_value + Σ nfw_perks.estimated_value (own redemptions)
 *   ZDS         : needs shopify_product_mappings.compare_at_price via the web API → null for now
 */
export function useSavings() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: queryKeys.savings(userId ?? "anon"),
    enabled: !!userId,
    queryFn: async (): Promise<Savings> => {
      const uid = userId!;
      const [grantsRes, offersRes, nfwRedRes] = await Promise.all([
        supabase.from("grants").select("amount_approved").eq("user_id", uid).eq("status", "payment_sent"),
        supabase.from("offer_redemptions").select("offer_value").eq("user_id", uid),
        supabase.from("nfw_perk_redemptions").select("perk_id").eq("user_id", uid),
      ]);
      for (const r of [grantsRes, offersRes, nfwRedRes]) if (r.error) throw r.error;

      const microgrants = (grantsRes.data ?? []).reduce((s, g) => s + Number(g.amount_approved ?? 0), 0);
      const accessPerks = (offersRes.data ?? []).reduce((s, o) => s + Number(o.offer_value ?? 0), 0);

      let nfwPerks = 0;
      const perkIds = (nfwRedRes.data ?? []).map((r) => r.perk_id).filter(Boolean);
      if (perkIds.length) {
        const { data: perks, error } = await supabase
          .from("nfw_perks")
          .select("id, estimated_value")
          .in("id", perkIds);
        if (error) throw error;
        const byId = new Map((perks ?? []).map((p) => [p.id, Number(p.estimated_value ?? 0)]));
        nfwPerks = perkIds.reduce((s, id) => s + (byId.get(id) ?? 0), 0);
      }

      const perks = accessPerks + nfwPerks;
      return { total: microgrants + perks, microgrants, perks, zeroDollarStore: null };
    },
  });
}

/** Counts for the dashboard "Your Perks & Benefits" summary. */
export function usePerksCounts() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ["perks-counts", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const uid = userId!;
      const [liked, access, nfw] = await Promise.all([
        supabase.from("store_likes").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("offer_redemptions").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("nfw_perk_redemptions").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      for (const r of [liked, access, nfw]) if (r.error) throw r.error;
      return {
        savedBrands: liked.count ?? 0,
        redeemed: (access.count ?? 0) + (nfw.count ?? 0),
      };
    },
  });
}

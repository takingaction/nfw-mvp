import { useQuery } from "@tanstack/react-query";

import { fetchSavings } from "@/lib/api/store";
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
 * "Your Membership at Work" totals — GET /api/dashboard/savings (same computation as
 * getSavings() in app/dashboard/page.tsx, incl. the Zero Dollar Store bucket which needs
 * shopify_product_mappings.compare_at_price via the service role). Web combines Access
 * Perks + NFW Perks into one "Perks" figure; we do the same here.
 */
export function useSavings() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: queryKeys.savings(userId ?? "anon"),
    enabled: !!userId,
    queryFn: async (): Promise<Savings> => {
      const data = await fetchSavings();
      const perks = Number(data.perks ?? 0) + Number(data.nfwPerks ?? 0);
      return {
        total: Number(data.total ?? 0),
        microgrants: Number(data.microgrants ?? 0),
        perks,
        zeroDollarStore: Number(data.zeroDollarStore ?? 0),
      };
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

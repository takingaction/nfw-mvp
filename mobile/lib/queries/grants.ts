import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createGrant, getStripeConnectStatus, type CreateGrantBody } from "@/lib/api/grants";

import { todayIsoDate } from "@/lib/format";
import { queryKeys } from "@/lib/queries/keys";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import type { GrantCycle, GrantDetail, GrantDocument, GrantWithCycle } from "@/types/grants";

/**
 * Open grant cycles — web: app/grants/apply/page.tsx (server) and the dashboard's
 * "Available Microgrants" strip.
 *   status = open, end_date >= today, is_testing_only = false unless admin,
 *   ordered by display_order then end_date.
 * `grant_cycles` SELECT policy is USING (true), so this works without the web API.
 */
export function useOpenGrantCycles() {
  const isAdmin = useAuthStore((s) => s.profile?.is_admin === true);

  return useQuery({
    queryKey: queryKeys.grantCycles(isAdmin),
    queryFn: async (): Promise<GrantCycle[]> => {
      let q = supabase
        .from("grant_cycles")
        .select(
          "id, cycle_name, description, start_date, end_date, amount_per_grant, grants_available, status, is_testing_only, featured_image, display_order",
        )
        .eq("status", "open")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("end_date", { ascending: true });

      if (!isAdmin) q = q.eq("is_testing_only", false);

      const { data, error } = await q;
      if (error) throw error;

      // Defense in depth — the pg_cron auto-close job has failed before (AGENTS.md 2026-07-23).
      const today = todayIsoDate();
      return (data ?? []).filter((c) => c.end_date >= today) as GrantCycle[];
    },
  });
}

/** The current member's applications — web: app/grants/my-applications/page.tsx. */
export function useMyGrants() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: queryKeys.myGrants(userId ?? "anon"),
    enabled: !!userId,
    queryFn: async (): Promise<GrantWithCycle[]> => {
      const { data, error } = await supabase
        .from("grants")
        .select("*, grant_cycles(cycle_name, amount_per_grant, end_date, featured_image)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GrantWithCycle[];
    },
  });
}

/** Single application — web: app/grants/view/[id]/page.tsx. RLS scopes to own rows. */
export function useGrant(grantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grant(grantId ?? ""),
    enabled: !!grantId,
    queryFn: async (): Promise<GrantDetail | null> => {
      const { data, error } = await supabase
        .from("grants")
        .select(
          "*, grant_cycles(cycle_name, description, start_date, end_date, amount_per_grant, grants_available)",
        )
        .eq("id", grantId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as GrantDetail) ?? null;
    },
  });
}

/** Supporting documents for an application. Viewing requires the web API (signed URL) — Slice B. */
export function useGrantDocuments(grantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.grantDocuments(grantId ?? ""),
    enabled: !!grantId,
    queryFn: async (): Promise<GrantDocument[]> => {
      const { data, error } = await supabase
        .from("grant_documents")
        .select("*")
        .eq("grant_id", grantId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GrantDocument[];
    },
  });
}

// ---------------------------------------------------------------------------
// Slice C — mutations + Stripe Connect
// ---------------------------------------------------------------------------

export function useCreateGrant() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (body: CreateGrantBody) => createGrant(body),
    onSuccess: () => {
      if (userId) void qc.invalidateQueries({ queryKey: queryKeys.myGrants(userId) });
      void qc.invalidateQueries({ queryKey: ["grant-cycles"] });
    },
  });
}

export const stripeStatusKey = (grantId: string) => ["stripe-connect-status", grantId] as const;

/** Stripe Connect onboarding status for a grant. Poll by calling refetch() after the browser closes. */
export function useStripeConnectStatus(grantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: stripeStatusKey(grantId ?? ""),
    enabled: !!grantId && enabled,
    queryFn: () => getStripeConnectStatus(grantId!),
    staleTime: 15 * 1000,
    retry: false,
  });
}

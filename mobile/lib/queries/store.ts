import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCheckout, fetchClaimsCheck, fetchMyClaims, fetchProducts, fetchStoreSettings, fetchSystemSettings } from "@/lib/api/store";
import { useAuthStore } from "@/stores/auth";

export const storeKeys = {
  products: ["store", "products"] as const,
  settings: ["store", "settings"] as const,
  system: ["store", "system-settings"] as const,
  claimsCheck: (userId: string) => ["store", "claims-check", userId] as const,
  myClaims: (userId: string) => ["store", "my-claims", userId] as const,
};

export function useProducts() {
  return useQuery({ queryKey: storeKeys.products, queryFn: fetchProducts, staleTime: 60 * 1000 });
}

export function useStoreSettings() {
  return useQuery({ queryKey: storeKeys.settings, queryFn: fetchStoreSettings, staleTime: 5 * 60 * 1000 });
}

export function useSystemSettings() {
  return useQuery({ queryKey: storeKeys.system, queryFn: fetchSystemSettings, staleTime: 30 * 1000, retry: false });
}

export function useClaimsCheck() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: storeKeys.claimsCheck(userId ?? "anon"),
    enabled: !!userId,
    queryFn: () => fetchClaimsCheck(userId!),
    staleTime: 30 * 1000,
  });
}

export function useMyClaims() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: storeKeys.myClaims(userId ?? "anon"),
    enabled: !!userId,
    queryFn: fetchMyClaims,
    staleTime: 30 * 1000,
  });
}

export function useCreateCheckout() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (vars: { variantId: string; productId: string }) => createCheckout({ ...vars, userId: userId! }),
    onSuccess: () => {
      if (!userId) return;
      // Optimistically mark the month as claimed (web never does this — see blueprint).
      qc.setQueryData(storeKeys.claimsCheck(userId), (prev: { claimedThisMonth: boolean; claimCount: number } | undefined) => ({
        claimedThisMonth: true,
        claimCount: (prev?.claimCount ?? 0) + 1,
      }));
      void qc.invalidateQueries({ queryKey: storeKeys.myClaims(userId) });
    },
  });
}

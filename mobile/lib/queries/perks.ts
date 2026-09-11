import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  checkRedemption,
  fetchCategories,
  fetchCollections,
  fetchFacets,
  fetchFreshRedemptionUrl,
  fetchNfwPerkBySlug,
  fetchNfwPerks,
  fetchNfwRedemptions,
  fetchOffer,
  fetchOfferLocations,
  fetchPerksSettings,
  fetchRedemptions,
  fetchShowNfwExclusiveButton,
  fetchStores,
  fetchUsesRemaining,
  redeemNfwPerk,
  redeemOffer,
  searchOffers,
  type OfferSearchParams,
  type SearchParams,
} from "@/lib/api/perks";
import { useAuthStore } from "@/stores/auth";
import { usePerksFilters, selectCanSearch } from "@/stores/perksFilters";
import { EXCLUDED_STORES, type RedemptionMethod } from "@/types/perks";

export const perksKeys = {
  stores: (p: SearchParams) => ["perks", "stores", p] as const,
  offers: (p: OfferSearchParams) => ["perks", "offers", p] as const,
  offer: (key: string) => ["perks", "offer", key] as const,
  usesRemaining: (key: string) => ["perks", "offer", key, "uses"] as const,
  redemptionCheck: (key: string) => ["perks", "offer", key, "redeemed"] as const,
  offerLocations: (group: string, zip: string | undefined, distance: string) => ["perks", "offer-locations", group, zip ?? "", distance] as const,
  categories: ["perks", "categories"] as const,
  facets: ["perks", "facets"] as const,
  redemptions: ["perks", "redemptions"] as const,
  nfwRedemptions: ["perks", "nfw-redemptions"] as const,
  nfwPerks: (search: string) => ["perks", "nfw", search] as const,
  nfwPerk: (slug: string) => ["perks", "nfw", "slug", slug] as const,
  collections: ["perks", "collections"] as const,
  settings: ["perks", "settings"] as const,
  showNfwButton: ["perks", "show-nfw-button"] as const,
};

/** Build API params from the filter store (shared by stores + offers). */
export function useSearchParamsFromFilters(): SearchParams & { canSearch: boolean } {
  const f = usePerksFilters();
  return {
    canSearch: selectCanSearch(f),
    query: f.query,
    postal_code: f.postalCode || undefined,
    distance: f.distance,
    online: f.onlineOnly ? "only" : undefined,
    category_key: f.categoryKeys,
    facet: f.facets,
    offer_types: f.offerTypes,
    page: f.page,
  };
}

/** Stores view — rollup, page-based (100 offers/page grouped server-side). */
export function useStores() {
  const { canSearch, ...params } = useSearchParamsFromFilters();
  return useQuery({
    queryKey: perksKeys.stores(params),
    enabled: canSearch,
    queryFn: async () => {
      const data = await fetchStores(params);
      return {
        ...data,
        groups: (data.groups ?? []).filter((g) => !EXCLUDED_STORES.has(g.name)),
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

/** Offers view — infinite scroll over /offers/search. */
export function useOffersInfinite(extra: Partial<OfferSearchParams> = {}, options: { enabled?: boolean } = {}) {
  const { canSearch, page: _page, ...params } = useSearchParamsFromFilters();
  const merged: OfferSearchParams = { ...params, ...extra, per_page: extra.per_page ?? 25 };
  return useInfiniteQuery({
    queryKey: perksKeys.offers(merged),
    enabled: (options.enabled ?? true) && (canSearch || !!extra.store_key || !!extra.offer_group_key),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchOffers({ ...merged, page: pageParam }),
    getNextPageParam: (last) => {
      const info = last.info;
      if (!info) return undefined;
      return info.current_page < info.total_pages ? info.current_page + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useOffer(offerKey: string | undefined) {
  return useQuery({
    queryKey: perksKeys.offer(offerKey ?? ""),
    enabled: !!offerKey,
    queryFn: () => fetchOffer(offerKey!),
  });
}

export function useUsesRemaining(offerKey: string | undefined) {
  return useQuery({
    queryKey: perksKeys.usesRemaining(offerKey ?? ""),
    enabled: !!offerKey,
    queryFn: () => fetchUsesRemaining(offerKey!),
    retry: false,
  });
}

export function useRedemptionCheck(offerKey: string | undefined) {
  return useQuery({
    queryKey: perksKeys.redemptionCheck(offerKey ?? ""),
    enabled: !!offerKey,
    queryFn: () => checkRedemption(offerKey!),
    retry: false,
  });
}

export function useOfferLocations(offerGroupKey: string | undefined, zip: string | undefined, distance: string) {
  return useQuery({
    queryKey: perksKeys.offerLocations(offerGroupKey ?? "", zip, distance),
    enabled: !!offerGroupKey,
    queryFn: () => fetchOfferLocations({ offer_group: offerGroupKey!, postal_code: zip || undefined, distance }),
  });
}

/** Location-specific offer_key for a multi-location offer (web: fetchLocationOfferKey). */
export async function resolveLocationOfferKey(offerGroupKey: string, locationKey: string | number): Promise<string | null> {
  const data = await searchOffers({ offer_group_key: offerGroupKey, location_key: locationKey, per_page: 1 });
  const k = data.offers?.[0]?.offer_key;
  return k !== undefined && k !== null ? String(k) : null;
}

export function useRedeemOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { offerKey: string; method: RedemptionMethod; locationKey?: string | number }) =>
      redeemOffer(vars.offerKey, vars.method, vars.locationKey),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: perksKeys.usesRemaining(vars.offerKey) });
      void qc.invalidateQueries({ queryKey: perksKeys.redemptionCheck(vars.offerKey) });
      void qc.invalidateQueries({ queryKey: perksKeys.redemptions });
      void qc.invalidateQueries({ queryKey: ["perks-counts"] });
    },
  });
}

export function useCategories() {
  return useQuery({ queryKey: perksKeys.categories, queryFn: fetchCategories, staleTime: 60 * 60 * 1000 });
}

export function useFacets() {
  return useQuery({ queryKey: perksKeys.facets, queryFn: fetchFacets, staleTime: 60 * 60 * 1000 });
}

export function useRedemptions() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...perksKeys.redemptions, userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const [access, nfw] = await Promise.all([fetchRedemptions({ limit: 50 }), fetchNfwRedemptions()]);
      return { access: access.redemptions, nfw };
    },
  });
}

export function useFreshRedemptionUrl() {
  return useMutation({ mutationFn: (id: string) => fetchFreshRedemptionUrl(id) });
}

export function useNfwPerks(search = "") {
  return useQuery({
    queryKey: perksKeys.nfwPerks(search),
    queryFn: async () => (await fetchNfwPerks({ search })).perks,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNfwPerk(slug: string | undefined) {
  return useQuery({
    queryKey: perksKeys.nfwPerk(slug ?? ""),
    enabled: !!slug,
    queryFn: () => fetchNfwPerkBySlug(slug!),
  });
}

export function useRedeemNfwPerk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => redeemNfwPerk(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["perks", "nfw"] });
      void qc.invalidateQueries({ queryKey: perksKeys.redemptions });
      void qc.invalidateQueries({ queryKey: ["perks-counts"] });
      void qc.invalidateQueries({ queryKey: ["savings"] });
    },
  });
}

export function useCollections() {
  return useQuery({ queryKey: perksKeys.collections, queryFn: fetchCollections, staleTime: 5 * 60 * 1000 });
}

export function usePerksSettings() {
  return useQuery({ queryKey: perksKeys.settings, queryFn: fetchPerksSettings, staleTime: 5 * 60 * 1000 });
}

export function useShowNfwExclusiveButton() {
  return useQuery({ queryKey: perksKeys.showNfwButton, queryFn: fetchShowNfwExclusiveButton, staleTime: 10 * 60 * 1000 });
}

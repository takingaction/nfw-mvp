import { api, apiDelete, apiGet, apiPost } from "@/lib/api";
import type {
  AccessOffer,
  CategoryNode,
  Facet,
  LikedStore,
  LocationGroup,
  LocationsResponse,
  NfwPerk,
  NfwPerkRedeemResponse,
  NfwPerkRedemption,
  OfferRedemption,
  OfferSearchResponse,
  PerkCollection,
  PerksSettings,
  RedeemResponse,
  RedemptionCheck,
  RedemptionMethod,
  RollupResponse,
  StoreGroup,
  UsesRemaining,
} from "@/types/perks";

/**
 * Typed wrappers over the existing Next.js API routes. All authenticated
 * requests carry the Supabase access token as `Authorization: Bearer` — see
 * lib/api.ts and the web change in lib/supabase/server.ts.
 */

// ---------------------------------------------------------------------------
// Search / browse
// ---------------------------------------------------------------------------

export interface SearchParams {
  query?: string;
  postal_code?: string;
  /** "5mi" … "100mi" | "2500mi" (Nationwide sentinel handled server-side) */
  distance?: string;
  online?: "only";
  category_key?: number[];
  facet?: string[];
  /** stores/locations rollup uses `offer_types` (plural); offers search uses `offer_type`. */
  offer_types?: string[];
  page?: number;
  per_page?: number;
}

function commonQuery(p: SearchParams) {
  return {
    query: p.query?.trim() || undefined,
    postal_code: p.postal_code || undefined,
    distance: p.distance,
    online: p.online,
    category_key: p.category_key?.length ? p.category_key.join(",") : undefined,
    facet: p.facet?.length ? p.facet.join(",") : undefined,
    page: p.page,
  };
}

export function fetchStores(p: SearchParams) {
  return apiGet<RollupResponse<StoreGroup>>("/api/access-perks/rollup", {
    query: { ...commonQuery(p), rollup: "stores", offer_types: p.offer_types?.length ? p.offer_types.join(",") : undefined },
  });
}

export function fetchLocations(p: SearchParams) {
  return apiGet<RollupResponse<LocationGroup>>("/api/access-perks/rollup", {
    query: { ...commonQuery(p), rollup: "locations", offer_types: p.offer_types?.length ? p.offer_types.join(",") : undefined },
  });
}

export interface OfferSearchParams extends SearchParams {
  store_key?: number | string;
  location_key?: number | string;
  offer_group_key?: string;
  national?: "include";
}

export function searchOffers(p: OfferSearchParams) {
  return apiGet<OfferSearchResponse>("/api/access-perks/offers/search", {
    query: {
      ...commonQuery(p),
      per_page: p.per_page ?? 25,
      offer_type: p.offer_types?.length ? p.offer_types.join(",") : undefined,
      store_key: p.store_key,
      location_key: p.location_key,
      offer_group_key: p.offer_group_key,
      national: p.national,
    },
  });
}

export async function fetchOffer(offerKey: string | number): Promise<AccessOffer | null> {
  const data = await apiGet<{ offers?: AccessOffer[]; offer?: AccessOffer }>(`/api/access-perks/offers/${encodeURIComponent(String(offerKey))}`);
  return data.offers?.[0] ?? data.offer ?? null;
}

export function fetchUsesRemaining(offerKey: string | number) {
  return apiGet<UsesRemaining>(`/api/access-perks/offers/${encodeURIComponent(String(offerKey))}/uses-remaining`);
}

export function redeemOffer(offerKey: string | number, method: RedemptionMethod, locationKey?: string | number) {
  return apiPost<RedeemResponse>(`/api/access-perks/offers/${encodeURIComponent(String(offerKey))}/redeem`, {
    method,
    ...(locationKey !== undefined ? { location_key: String(locationKey) } : {}),
  });
}

/** Locations for a multi-location offer. No postal_code ⇒ server uses profile ZIP. */
export function fetchOfferLocations(params: { offer_group?: string; store_key?: number | string; postal_code?: string; distance?: string; per_page?: number }) {
  return apiGet<LocationsResponse>("/api/access-perks/locations", {
    query: { ...params, distance: params.distance ?? "100mi", per_page: params.per_page ?? 10 },
  });
}

export async function fetchCategories(): Promise<CategoryNode[]> {
  const data = await apiGet<{ categories: CategoryNode[] }>("/api/access-perks/categories", { anonymous: true });
  return data.categories ?? [];
}

export async function fetchFacets(): Promise<Facet[]> {
  const data = await apiGet<{ facets: Facet[] }>("/api/access-perks/facets", { anonymous: true });
  return data.facets ?? [];
}

// ---------------------------------------------------------------------------
// Redemptions
// ---------------------------------------------------------------------------

export function fetchRedemptions(params: { limit?: number; offset?: number; status?: string } = {}) {
  return apiGet<{ redemptions: OfferRedemption[]; total_count: number }>("/api/access-perks/redemptions", {
    query: { limit: params.limit ?? 50, offset: params.offset, status: params.status, exclude_archived: true },
  });
}

export function updateRedemptionStatus(id: string, status: "active" | "used" | "archived") {
  return api<{ success: true; redemption: OfferRedemption }>(`/api/access-perks/redemptions/${id}`, { method: "PATCH", body: { status } });
}

/** Re-mint an expiring coupon URL. 410 ⇒ link expired / offer gone. */
export function fetchFreshRedemptionUrl(id: string) {
  return apiGet<{ url: string; cached: boolean }>(`/api/access-perks/redemptions/${id}/fresh-url`);
}

export function checkRedemption(offerKey: string | number) {
  return apiGet<RedemptionCheck>("/api/perks/redemptions/check", { query: { offer_key: String(offerKey) } });
}

// ---------------------------------------------------------------------------
// Liked stores
// ---------------------------------------------------------------------------

export async function fetchLikedStores(): Promise<LikedStore[]> {
  const data = await apiGet<{ stores: LikedStore[] }>("/api/perks/liked-stores");
  return data.stores ?? [];
}

export function likeStore(store: { store_key: string | number; store_name: string; logo_url?: string | null }) {
  return apiPost<{ success: true; store: LikedStore }>("/api/perks/liked-stores", {
    store_key: store.store_key,
    store_name: store.store_name,
    logo_url: store.logo_url ?? undefined,
  });
}

export function unlikeStore(storeKey: string | number) {
  return apiDelete<{ success: true }>(`/api/perks/liked-stores/${encodeURIComponent(String(storeKey))}`);
}

// ---------------------------------------------------------------------------
// NFW Exclusive perks
// ---------------------------------------------------------------------------

export async function fetchNfwPerks(params: { search?: string; categories?: string[]; limit?: number; offset?: number } = {}) {
  return apiGet<{ perks: NfwPerk[]; total: number }>("/api/nfw-perks", {
    query: {
      search: params.search?.trim() || undefined,
      categories: params.categories?.length ? params.categories.join(",") : undefined,
      limit: params.limit ?? 50,
      offset: params.offset,
    },
  });
}

export function fetchNfwPerkBySlug(slug: string) {
  return apiGet<NfwPerk>(`/api/nfw-perks/slug/${encodeURIComponent(slug)}`);
}

export function redeemNfwPerk(id: string) {
  return apiPost<NfwPerkRedeemResponse>(`/api/nfw-perks/${id}/redeem`);
}

export async function fetchNfwRedemptions(): Promise<NfwPerkRedemption[]> {
  const data = await apiGet<{ redemptions: NfwPerkRedemption[] }>("/api/nfw-perks/redemptions");
  return data.redemptions ?? [];
}

// ---------------------------------------------------------------------------
// Collections / settings
// ---------------------------------------------------------------------------

export async function fetchCollections(): Promise<PerkCollection[]> {
  const data = await apiGet<{ collections: PerkCollection[] }>("/api/perk-collections");
  return (data.collections ?? []).sort((a, b) => a.display_order - b.display_order);
}

export function fetchPerksSettings() {
  return apiGet<PerksSettings | null>("/api/perks/settings", { anonymous: true });
}

export async function fetchShowNfwExclusiveButton(): Promise<boolean> {
  try {
    const data = await apiGet<{ show_nfw_exclusive_button?: boolean } | null>("/api/site/settings", { anonymous: true });
    return data?.show_nfw_exclusive_button !== false;
  } catch {
    return true;
  }
}

export function fetchProfileZip() {
  return apiGet<{ zip: string | null }>("/api/profile");
}

import { create } from "zustand";

import { NATIONWIDE_DISTANCE } from "@/types/perks";

/**
 * Perks search/filter state — mirrors the state in app/perks/page.tsx.
 * Default distance 10mi; ZIP comes from the profile on first load; Nationwide
 * clears the ZIP. Filters persist across tab switches within a session.
 */
export type PerksView = "stores" | "offers";

interface PerksFiltersState {
  view: PerksView;
  query: string;
  postalCode: string;
  /** Profile ZIP, remembered so Reset/“back from Nationwide” can restore it. */
  profileZip: string | null;
  distance: string;
  onlineOnly: boolean;
  categoryKeys: number[];
  facets: string[];
  offerTypes: string[];
  page: number;
  /** NFW Exclusive toggle — swaps the results area for NFW perks. */
  nfwOnly: boolean;

  setView: (view: PerksView) => void;
  setQuery: (q: string) => void;
  setPostalCode: (zip: string) => void;
  setProfileZip: (zip: string | null) => void;
  setDistance: (d: string) => void;
  setOnlineOnly: (v: boolean) => void;
  toggleCategory: (key: number) => void;
  toggleFacet: (key: string) => void;
  toggleOfferType: (key: string) => void;
  setPage: (p: number) => void;
  setNfwOnly: (v: boolean) => void;
  /** Sidebar "Reset": clears categories, facets, offer types, online-only (not zip/distance/query). */
  resetFilters: () => void;
  /** Search bar RESET: clears everything back to profile ZIP + 10mi (or Nationwide if no ZIP). */
  resetAll: () => void;
  hasActiveFilters: () => boolean;
}

export const usePerksFilters = create<PerksFiltersState>((set, get) => ({
  view: "stores",
  query: "",
  postalCode: "",
  profileZip: null,
  distance: "10mi",
  onlineOnly: false,
  categoryKeys: [],
  facets: [],
  offerTypes: [],
  page: 1,
  nfwOnly: false,

  setView: (view) => set({ view, page: 1 }),
  setQuery: (query) => set({ query, page: 1 }),
  setPostalCode: (postalCode) => set({ postalCode: postalCode.replace(/\D/g, "").slice(0, 5), page: 1 }),
  setProfileZip: (profileZip) =>
    set((s) => ({
      profileZip,
      // First load: adopt the profile ZIP if the user hasn't typed one.
      postalCode: s.postalCode || (s.distance === NATIONWIDE_DISTANCE ? "" : profileZip ?? ""),
    })),
  setDistance: (distance) =>
    set((s) => ({
      distance,
      page: 1,
      // Nationwide clears ZIP; leaving Nationwide restores the profile ZIP.
      postalCode: distance === NATIONWIDE_DISTANCE ? "" : s.postalCode || s.profileZip || "",
    })),
  setOnlineOnly: (onlineOnly) => set({ onlineOnly, page: 1 }),
  toggleCategory: (key) =>
    set((s) => ({
      categoryKeys: s.categoryKeys.includes(key) ? s.categoryKeys.filter((k) => k !== key) : [...s.categoryKeys, key],
      page: 1,
    })),
  toggleFacet: (key) =>
    set((s) => ({ facets: s.facets.includes(key) ? s.facets.filter((k) => k !== key) : [...s.facets, key], page: 1 })),
  toggleOfferType: (key) =>
    set((s) => ({
      offerTypes: s.offerTypes.includes(key) ? s.offerTypes.filter((k) => k !== key) : [...s.offerTypes, key],
      page: 1,
    })),
  setPage: (page) => set({ page }),
  setNfwOnly: (nfwOnly) => set({ nfwOnly, view: "stores", page: 1 }),

  resetFilters: () => set({ categoryKeys: [], facets: [], offerTypes: [], onlineOnly: false, page: 1 }),
  resetAll: () => {
    const { profileZip } = get();
    set({
      view: "stores",
      query: "",
      categoryKeys: [],
      facets: [],
      offerTypes: [],
      onlineOnly: false,
      page: 1,
      nfwOnly: false,
      distance: profileZip ? "10mi" : NATIONWIDE_DISTANCE,
      postalCode: profileZip ?? "",
    });
  },
  hasActiveFilters: () => {
    const s = get();
    return s.categoryKeys.length > 0 || s.facets.length > 0 || s.offerTypes.length > 0 || s.onlineOnly;
  },
}));


/** True when a search can run: a ZIP is set, or the user picked Nationwide. */
export function selectCanSearch(s: PerksFiltersState): boolean {
  return s.distance === NATIONWIDE_DISTANCE || s.postalCode.length === 5;
}

import { create } from "zustand";

import { fetchLikedStores, likeStore, unlikeStore } from "@/lib/api/perks";
import type { LikedStore } from "@/types/perks";

/**
 * Liked ("saved") stores — mirrors `likedStoreKeys` + handleToggleLike in
 * app/perks/page.tsx. Keys are strings; Access Perks stores use the numeric
 * store_key, NFW partners use partner_name.
 *
 * Optimistic: the heart flips immediately and reverts if the API call fails.
 */
interface LikedStoresState {
  stores: LikedStore[];
  keys: Set<string>;
  loaded: boolean;
  loading: boolean;

  load: () => Promise<void>;
  isLiked: (storeKey: string | number) => boolean;
  toggle: (store: { store_key: string | number; store_name: string; logo_url?: string | null }) => Promise<void>;
  remove: (storeKey: string | number) => Promise<void>;
  reset: () => void;
}

export const useLikedStores = create<LikedStoresState>((set, get) => ({
  stores: [],
  keys: new Set(),
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const stores = await fetchLikedStores();
      set({ stores, keys: new Set(stores.map((s) => String(s.store_key))), loaded: true });
    } catch (err) {
      console.warn("[likedStores] load failed", err);
    } finally {
      set({ loading: false });
    }
  },

  isLiked: (storeKey) => get().keys.has(String(storeKey)),

  toggle: async (store) => {
    const key = String(store.store_key);
    const wasLiked = get().keys.has(key);

    // Optimistic update
    set((s) => {
      const keys = new Set(s.keys);
      let stores = s.stores;
      if (wasLiked) {
        keys.delete(key);
        stores = stores.filter((x) => String(x.store_key) !== key);
      } else {
        keys.add(key);
        stores = [
          {
            id: `optimistic-${key}`,
            user_id: "",
            store_key: key,
            store_name: store.store_name,
            logo_url: store.logo_url ?? null,
            created_at: new Date().toISOString(),
          },
          ...stores,
        ];
      }
      return { keys, stores };
    });

    try {
      if (wasLiked) {
        await unlikeStore(key);
      } else {
        const { store: saved } = await likeStore(store);
        set((s) => ({ stores: s.stores.map((x) => (x.id === `optimistic-${key}` ? saved : x)) }));
      }
    } catch (err) {
      console.warn("[likedStores] toggle failed, reverting", err);
      // Revert
      set((s) => {
        const keys = new Set(s.keys);
        let stores = s.stores;
        if (wasLiked) {
          keys.add(key);
          // We don't have the original row; reload from server.
          void get().load();
        } else {
          keys.delete(key);
          stores = stores.filter((x) => String(x.store_key) !== key);
        }
        return { keys, stores };
      });
    }
  },

  remove: async (storeKey) => {
    const key = String(storeKey);
    if (!get().keys.has(key)) return;
    await get().toggle({ store_key: key, store_name: "" });
  },

  reset: () => set({ stores: [], keys: new Set(), loaded: false, loading: false }),
}));

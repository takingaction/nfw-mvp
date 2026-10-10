"use client";

/**
 * Shared nav auth state.
 *
 * One Supabase auth subscription, one profile fetch, read by all three
 * nav components (AuthButtonCombined, MobileMenu, FloatingAdminButton) via
 * the `useNavAuth()` hook. Replaces the three independent copies of this
 * logic that each component used to carry, plus the bespoke
 * `nfw-admin-status-change` CustomEvent that FloatingAdminButton used to
 * listen for.
 *
 * State is seeded by `initNavAuth(initialSignedIn)` — a server-derived
 * boolean from a cookie check in `Navigation.tsx`. The async work
 * (getSession + onAuthStateChange) kicks off on mount; localStorage
 * `nfw_profile` cache is hydrated synchronously in the same call so the
 * first paint already has fullName / isAdmin / isReviewer.
 */

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

export interface NavAuthState {
  status: "loading" | "in" | "out";
  user: { id: string; email: string | null } | null;
  fullName: string | null;
  isAdmin: boolean;
  isReviewer: boolean;
}

let state: NavAuthState = {
  status: "loading",
  user: null,
  fullName: null,
  isAdmin: false,
  isReviewer: false,
};

const listeners = new Set<() => void>();

function setState(partial: Partial<NavAuthState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NavAuthState {
  return state;
}

function getServerSnapshot(): NavAuthState {
  return state;
}

// One-time init guard. Multiple components may call initNavAuth(); only the
// first call does the work.
let initStarted = false;

function startInit(initialSignedIn: boolean): void {
  if (typeof window === "undefined") return;
  if (initStarted) return;
  initStarted = true;

  // Sync seed so the first paint already has the right status + profile
  // (from localStorage). Idempotent: only acts while status is "loading".
  if (state.status === "loading") {
    let cachedProfile: Partial<NavAuthState> = {};
    try {
      const cached = window.localStorage.getItem("nfw_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        cachedProfile = {
          fullName: parsed.full_name ?? null,
          isAdmin: parsed.is_admin === true,
          isReviewer: parsed.is_reviewer === true,
        };
      }
    } catch {
      // localStorage parse error — ignore and start clean
    }
    state = {
      ...state,
      ...cachedProfile,
      status: initialSignedIn ? "in" : "out",
    };
    listeners.forEach((l) => l());
  }

  // Async work: get the real session, fetch profile, subscribe to changes.
  (async () => {
    const supabase = createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setState({
        status: "in",
        user: { id: session.user.id, email: session.user.email ?? null },
      });
      await fetchProfile();
    } else {
      setState({ status: "out", user: null });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        try {
          window.localStorage.removeItem("nfw_profile");
        } catch {
          // ignore
        }
        setState({
          status: "out",
          user: null,
          fullName: null,
          isAdmin: false,
          isReviewer: false,
        });
        return;
      }
      if (session?.user) {
        setState({
          status: "in",
          user: { id: session.user.id, email: session.user.email ?? null },
        });
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          await fetchProfile();
        }
      }
    });
  })();
}

async function fetchProfile(): Promise<void> {
  try {
    const response = await fetch("/api/auth/profile");
    if (response.ok) {
      const data = await response.json();
      setState({
        fullName: data.full_name ?? null,
        isAdmin: data.is_admin === true,
        isReviewer: data.is_reviewer === true,
      });
      try {
        window.localStorage.setItem("nfw_profile", JSON.stringify(data));
      } catch {
        // quota / private mode — non-fatal
      }
    }
  } catch (error) {
    console.error("[nav-auth] Failed to fetch profile:", error);
  }
}

/**
 * Call once at app start (from NavAuthInit) to seed the store and start
 * the auth subscription. Safe to call multiple times — only the first
 * call does work.
 */
export function initNavAuth(initialSignedIn: boolean): void {
  startInit(initialSignedIn);
}

export function useNavAuth(): NavAuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

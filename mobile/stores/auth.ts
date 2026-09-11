import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/profile";

const PROFILE_COLUMNS =
  "id, email, full_name, avatar_url, membership_level, subscription_status, subscription_ends_at, profile_completed, is_admin, is_reviewer, is_approved_free_member, free_membership_contact_submitted, date_of_birth, phone_number, address_line1, address_line2, city, state, zip, household_income, identities, social_handles, stripe_onboarding_completed, access_perks_member_id, joined_at";

function placeholderProfile(id: string, email: string | null): Profile {
  return {
    id,
    email,
    full_name: null,
    avatar_url: null,
    membership_level: "free",
    subscription_status: null,
    subscription_ends_at: null,
    profile_completed: false,
    is_admin: false,
    is_reviewer: false,
    is_approved_free_member: false,
    free_membership_contact_submitted: false,
    date_of_birth: null,
    phone_number: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    zip: null,
    household_income: null,
    identities: null,
    social_handles: null,
    stripe_onboarding_completed: false,
    access_perks_member_id: null,
    joined_at: null,
  };
}

/**
 * Auth + profile state.
 *
 *  status:
 *   - "loading"          → restoring session from secure storage on cold start
 *   - "unauthenticated"  → no session
 *   - "authenticated"    → session present (profile may still be null while fetching)
 *
 * The Supabase client owns token persistence/refresh; this store is a React-
 * friendly mirror of it plus the member profile from GET /api/auth/profile.
 */
type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileError: string | null;

  /** Call once from the root layout. Restores the session and subscribes to auth changes. */
  initialize: () => Promise<() => void>;
  /** Re-fetch the member profile from the web API. */
  refreshProfile: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Internal: apply a session from Supabase and (re)load the profile. */
  _applySession: (session: Session | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  user: null,
  profile: null,
  profileError: null,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    await get()._applySession(data.session);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Fire-and-forget; the store updates as soon as the session changes and
      // again when the profile arrives.
      void get()._applySession(session);
    });

    return () => listener.subscription.unsubscribe();
  },

  _applySession: async (session) => {
    if (!session) {
      set({ status: "unauthenticated", session: null, user: null, profile: null, profileError: null });
      return;
    }

    set({ status: "authenticated", session, user: session.user });
    await get().refreshProfile();
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    try {
      // Direct read of the member's own `profiles` row. RLS permits own-row SELECT
      // (migration 159), so this works without the web API's cookie-based auth.
      // Mirrors app/api/auth/profile/route.ts incl. the `null → "free"` normalisation.
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        // Auth user exists but no profile row yet (email just confirmed, or the
        // web-side defensive insert hasn't run). Treat as an incomplete free member.
        set({ profile: placeholderProfile(session.user.id, session.user.email ?? null), profileError: null });
        return;
      }

      const profile = { ...(data as unknown as Profile), membership_level: (data.membership_level ?? "free") as Profile["membership_level"] };
      set({ profile, profileError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load profile";
      console.warn("[auth] profile fetch failed:", message);
      set({ profileError: message });
    }
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange → _applySession handles the rest.
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ status: "unauthenticated", session: null, user: null, profile: null, profileError: null });
  },
}));

/** Selector helpers */
export const selectIsAuthenticated = (s: AuthState) => s.status === "authenticated";
export const selectIsLoading = (s: AuthState) => s.status === "loading";

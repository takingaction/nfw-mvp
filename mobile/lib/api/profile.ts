import { api, apiGet, apiPost } from "@/lib/api";
import type { SocialHandles } from "@/types/profile";

/**
 * Profile / account API wrappers. Contracts: app/api/profile/*, app/api/gift-codes/redeem,
 * app/api/waitlist, app/api/signup.
 */

/** Subset of ALLOWED_FIELDS in app/api/profile/update/route.ts that exist in the DB. */
export interface ProfileUpdate {
  full_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  household_income?: string;
  identities?: string[];
  social_handles?: SocialHandles;
  profile_completed?: boolean;
  membership_level?: string;
  avatar_url?: string | null;
}

export function updateProfile(body: ProfileUpdate) {
  return apiPost<{ success: true }>("/api/profile/update", body as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Avatar (multipart field `avatar`; JPEG/PNG/WebP ≤ 2 MB; server crops to 400² WebP)
// ---------------------------------------------------------------------------

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function uploadAvatar(file: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append("avatar", file as unknown as Blob);
  return api<{ success: true; avatar_url: string }>("/api/profile/avatar", { method: "POST", rawBody: form });
}

export function deleteAvatar() {
  return apiPost<{ success: true; message?: string }>("/api/profile/avatar/delete");
}

// ---------------------------------------------------------------------------
// Gift codes
// ---------------------------------------------------------------------------

export function redeemGiftCode(code: string) {
  return apiPost<{ success: true; message: string; subscriptionEndsAt: string }>("/api/gift-codes/redeem", { code: code.trim().toUpperCase() });
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

export interface DeletionRequest {
  id: string;
  status: "pending" | "verified" | "processing" | "completed" | "cancelled";
  requested_at: string;
  cancelled_at: string | null;
  processed_at: string | null;
}

export function getDeletionRequest() {
  return apiGet<{ hasRequest: false } | { hasRequest: true; request: DeletionRequest }>("/api/profile/request-deletion");
}

export function requestDeletion() {
  return apiPost<{ success: true; requestId: string; message: string }>("/api/profile/request-deletion");
}

export function cancelDeletion() {
  return apiPost<{ success: true; message: string }>("/api/profile/cancel-deletion");
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

/** Server sets membership_level='waitlist', free_membership_contact_submitted=true, etc. */
export function joinWaitlist() {
  return apiPost<{ success: true; message?: string }>("/api/waitlist");
}

export function getWaitlist() {
  return apiGet<{ joinedAt: string | null; totalInQueue: number }>("/api/waitlist");
}

// ---------------------------------------------------------------------------
// Sign-up sidebar content (CMS)
// ---------------------------------------------------------------------------

export interface SignupContent {
  eyebrow: string;
  headline: string;
  body_text: string | null;
  benefits: string[] | null;
  testimonial_text: string | null;
  testimonial_author: string | null;
}

export const DEFAULT_SIGNUP_CONTENT: SignupContent = {
  eyebrow: "JOIN WOMEN NATIONWIDE",
  headline: "Become a Member",
  body_text: "NFW membership helps you get relief for yourself while helping other women at the same time. Membership includes:",
  benefits: [
    "Microgrants from $100-$5,000",
    "Thousands of perks & discounts",
    "Zero Dollar Store giveaways",
    "Feel-good support that is simple, fast and low stress",
    "A community that gets it",
    "A mission-driven community supporting women",
  ],
  testimonial_text: null,
  testimonial_author: null,
};

export async function fetchSignupContent(): Promise<SignupContent> {
  try {
    const data = await apiGet<SignupContent | null>("/api/signup", { anonymous: true });
    return data ? { ...DEFAULT_SIGNUP_CONTENT, ...data } : DEFAULT_SIGNUP_CONTENT;
  } catch {
    return DEFAULT_SIGNUP_CONTENT;
  }
}

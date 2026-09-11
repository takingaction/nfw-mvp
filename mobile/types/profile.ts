/**
 * Subset of the `profiles` table exposed to the mobile app.
 * Mirrors the shape returned by GET /api/auth/profile in the web repo,
 * which normalises `membership_level: null` → "free".
 */
export type MembershipLevel = "free" | "contributing" | "founding" | "waitlist";

export type SubscriptionStatus = "active" | "canceling" | "cancelled" | "failed" | null;

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  membership_level: MembershipLevel;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
  profile_completed: boolean;
  is_admin: boolean;
  is_reviewer: boolean;
  is_approved_free_member: boolean;
  free_membership_contact_submitted: boolean | null;
  date_of_birth: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  stripe_onboarding_completed: boolean;
  access_perks_member_id: string | null;
  joined_at: string | null;
}

/** Placeholder DOB written by the signup flow before the user enters a real date. */
export const PLACEHOLDER_DOB = "1900-01-01";

export function needsDateOfBirth(profile: Pick<Profile, "date_of_birth"> | null): boolean {
  return !profile?.date_of_birth || profile.date_of_birth === PLACEHOLDER_DOB;
}

/**
 * Mirrors the access matrix in AGENTS.md ("Free Membership Admin Approval System").
 * Paid tiers always have access; free members need admin approval; waitlist never.
 */
export function canAccessMemberBenefits(profile: Profile | null): boolean {
  if (!profile) return false;
  if (profile.membership_level === "contributing" || profile.membership_level === "founding") return true;
  if (profile.membership_level === "free") return profile.is_approved_free_member === true;
  return false;
}

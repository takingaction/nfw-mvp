/**
 * Subset of the `profiles` table exposed to the mobile app.
 * Mirrors the shape returned by GET /api/auth/profile in the web repo,
 * which normalises `membership_level: null` → "free".
 */
export type MembershipLevel = "free" | "contributing" | "founding" | "waitlist";

export type SubscriptionStatus = "active" | "canceling" | "cancelled" | "failed" | null;

export interface SocialHandles {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
}

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
  phone_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  household_income: string | null;
  identities: string[] | null;
  social_handles: SocialHandles | null;
  stripe_onboarding_completed: boolean;
  access_perks_member_id: string | null;
  joined_at: string | null;
  /** Set when an admin paused this member's access (web migration 205). */
  access_paused_at: string | null;
}

/** Mirrors ACCESS_PAUSED_* in the web repo's lib/member-access.ts. */
export const ACCESS_PAUSED_EMAIL = "hello@nationalfundforwomen.org";
export const ACCESS_PAUSED_MESSAGE =
  `Your NFW membership access has been temporarily limited as we investigate an issue with your account. If you have any questions, please contact ${ACCESS_PAUSED_EMAIL}.`;

export function isAccessPaused(profile: Pick<Profile, "access_paused_at"> | null | undefined): boolean {
  return !!profile?.access_paused_at;
}

/** Placeholder DOB written by the signup flow before the user enters a real date. */
export const PLACEHOLDER_DOB = "1900-01-01";

export function needsDateOfBirth(profile: Pick<Profile, "date_of_birth"> | null): boolean {
  return !profile?.date_of_birth || profile.date_of_birth === PLACEHOLDER_DOB;
}

/**
 * Mirrors hasMemberAccess() in the web repo's lib/member-access.ts.
 * Paused members never; paid tiers always; free members need admin approval;
 * waitlist never.
 */
export function canAccessMemberBenefits(profile: Profile | null): boolean {
  if (!profile) return false;
  if (isAccessPaused(profile)) return false;
  if (profile.membership_level === "contributing" || profile.membership_level === "founding") return true;
  if (profile.membership_level === "free") return profile.is_approved_free_member === true;
  return false;
}

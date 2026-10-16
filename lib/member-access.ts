/**
 * Single source of truth for "can this member use benefits past the dashboard?"
 * (perks, Zero Dollar Store claims, travel, new grant applications).
 *
 * Safe to import from client components — no server-only dependencies.
 * Server routes should use requireMemberAccess() from lib/member-access-server.ts.
 *
 * Mirrors mobile/types/profile.ts canAccessMemberBenefits(); keep them in sync.
 */

export interface MemberAccessProfile {
  membership_level?: string | null;
  is_approved_free_member?: boolean | null;
  access_paused_at?: string | null;
}

/** Columns needed by the helpers below — add to any profile select that uses them. */
export const MEMBER_ACCESS_COLUMNS = "membership_level, is_approved_free_member, access_paused_at";

export const ACCESS_PAUSED_EMAIL = "hello@nationalfundforwomen.org";

export const ACCESS_PAUSED_MESSAGE =
  `Your NFW membership access has been temporarily limited as we investigate an issue with your account. If you have any questions, please contact ${ACCESS_PAUSED_EMAIL}.`;

/** True when an admin has paused this member (migration 205). */
export function isAccessPaused(profile: MemberAccessProfile | null | undefined): boolean {
  return !!profile?.access_paused_at;
}

/**
 * Tier rule only (ignores a pause): paid tiers always have access, free members
 * need admin approval, waitlist / unknown / missing tier never.
 */
export function hasTierAccess(profile: MemberAccessProfile | null | undefined): boolean {
  const level = profile?.membership_level;
  if (level === "contributing" || level === "founding") return true;
  if (level === "free") return profile?.is_approved_free_member === true;
  return false;
}

/** Full access check: not paused AND tier allows it. */
export function hasMemberAccess(profile: MemberAccessProfile | null | undefined): boolean {
  return !isAccessPaused(profile) && hasTierAccess(profile);
}

/**
 * Where a locked member should be sent from a benefits page.
 * Paused members go to the dashboard (which shows the paused banner) — never to
 * the membership step, so they aren't prompted to pay again.
 */
export function lockedRedirectPath(
  profile: MemberAccessProfile | null | undefined,
  next?: string,
): string {
  if (isAccessPaused(profile)) return "/dashboard";
  return next ? `/auth/sign-up?step=3&next=${encodeURIComponent(next)}` : "/auth/sign-up?step=3";
}

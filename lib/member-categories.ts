/**
 * Shared membership category utilities for NFW admin pages.
 * All category calculations should use these functions to ensure
 * consistency between CSV export, analytics, and admin members pages.
 */

/**
 * Determines the membership category for a profile.
 * Categories: Admin, Founding, Contributing, Waitlist, Abandoned, Profile Incomplete, Free, Unknown
 */
export function getCategory(profile: Record<string, unknown>): string {
  const level = profile.membership_level as string | null;
  const isApproved = profile.is_approved_free_member as boolean | null;
  const profileCompleted = profile.profile_completed as boolean | null;
  const contactSubmitted = profile.free_membership_contact_submitted as boolean | null;
  const isAdmin = profile.is_admin as boolean | null;

  if (isAdmin) return "Admin";
  if (level === "founding") return "Founding";
  if (level === "contributing") return "Contributing";
  if (level === "waitlist") return "Waitlist";
  if (level === "free") {
    // Incomplete free members - differentiate between Abandoned and Profile Incomplete
    if (!contactSubmitted && isApproved !== true) {
      if (profileCompleted) {
        // Abandoned - completed profile but abandoned at step 3
        return "Abandoned";
      } else {
        // Profile Incomplete - never finished profile
        return "Profile Incomplete";
      }
    }
    // Free - approved member
    return "Free";
  }
  return "Unknown";
}

/**
 * Determines the subscription sub-status for a profile.
 * Statuses: Active, Canceling, Free, Pending, None
 */
export function getSubStatus(profile: Record<string, unknown>): string {
  const level = profile.membership_level as string | null;
  const isApproved = profile.is_approved_free_member as boolean | null;
  const profileCompleted = profile.profile_completed as boolean | null;
  const contactSubmitted = profile.free_membership_contact_submitted as boolean | null;
  const subStatus = profile.subscription_status as string | null;

  if (subStatus === "active") return "Active";
  if (subStatus === "canceling") return "Canceling";
  if (level === "free" && isApproved === true && profileCompleted === true && !["active", "canceling"].includes(subStatus || "")) {
    return "Free";
  }
  if (level === "free" && (!isApproved || !contactSubmitted)) {
    return "Pending";
  }
  if (level === "waitlist" || (level === "free" && profileCompleted !== true)) {
    return "None";
  }
  return "None";
}

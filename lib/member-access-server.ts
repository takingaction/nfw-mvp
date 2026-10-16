import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import {
  ACCESS_PAUSED_MESSAGE,
  MEMBER_ACCESS_COLUMNS,
  hasTierAccess,
  isAccessPaused,
  type MemberAccessProfile,
} from "@/lib/member-access";

/**
 * Server-side gate for routes that redeem / claim / apply for member benefits.
 * Returns a 403 response to send back, or null when the member has access.
 *
 *   const denied = await requireMemberAccess(user.id);
 *   if (denied) return denied;
 *
 * Reads the profile with the service role so it can't be fooled by a stale
 * client-side profile. Admins skip the tier rule (so admin test accounts can
 * exercise these flows) but are still blocked while paused.
 */
export async function requireMemberAccess(userId: string): Promise<NextResponse | null> {
  const { data: profile, error } = await getAdminClient()
    .from("profiles")
    .select(`${MEMBER_ACCESS_COLUMNS}, is_admin`)
    .eq("id", userId)
    .maybeSingle<MemberAccessProfile & { is_admin?: boolean | null }>();

  if (error) {
    console.error("[requireMemberAccess] profile lookup failed:", error);
    return NextResponse.json({ error: "Could not verify membership" }, { status: 500 });
  }

  return memberAccessDeniedResponse(profile);
}

/**
 * Same as requireMemberAccess() for routes that already loaded
 * MEMBER_ACCESS_COLUMNS (plus is_admin, if admins should skip the tier rule).
 */
export function memberAccessDeniedResponse(
  profile: (MemberAccessProfile & { is_admin?: boolean | null }) | null | undefined,
): NextResponse | null {
  if (isAccessPaused(profile)) {
    return NextResponse.json(
      { error: ACCESS_PAUSED_MESSAGE, code: "access_paused" },
      { status: 403 },
    );
  }
  if (!profile?.is_admin && !hasTierAccess(profile)) {
    return NextResponse.json(
      {
        error: "Your membership doesn't include this benefit yet.",
        code: "membership_required",
      },
      { status: 403 },
    );
  }
  return null;
}

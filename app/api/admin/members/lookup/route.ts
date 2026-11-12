import { NextRequest, NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { requireAdminOrScope } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

type LookupRow = {
  id: string;
  email: string;
  created_at: string;
  confirmation_sent_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  recovery_sent_at: string | null;
  banned_until: string | null;
  providers: string[];
  has_password: boolean;
  has_profile: boolean;
  profile_completed: boolean | null;
  membership_level: string | null;
  full_name: string | null;
};

export type AccountStatus =
  | "not_found"
  | "banned"
  | "unconfirmed"
  | "confirmed_no_profile"
  | "profile_incomplete"
  | "complete";

/** Plain-language status and what support should tell the person. */
function describe(row: LookupRow | null): { status: AccountStatus; summary: string; tellThem: string } {
  if (!row) {
    return {
      status: "not_found",
      summary: "No account uses this email.",
      tellThem:
        "Sign up at nationalfundforwomen.org/auth/sign-up. If they think they already signed up, ask whether they might have used a different email address.",
    };
  }

  const google = row.providers.includes("google");
  const howToLogIn = row.has_password && google
    ? "with their password or with Google"
    : google
      ? "with the Google button"
      : "with the email and password they chose when signing up";

  if (row.banned_until && new Date(row.banned_until) > new Date()) {
    return {
      status: "banned",
      summary: "This account is blocked from signing in.",
      tellThem: "Check with an admin before replying.",
    };
  }
  if (!row.email_confirmed_at) {
    return {
      status: "unconfirmed",
      summary: "Signed up but has not confirmed their email yet.",
      tellThem:
        "Log in at nationalfundforwomen.org/auth/login; the page offers to resend the confirmation email. Ask them to check spam, and to press the button on the page the link opens.",
    };
  }
  if (!row.has_profile) {
    return {
      status: "confirmed_no_profile",
      summary: "Email is confirmed, but they never finished signup step 1, so they don't appear in the members list yet.",
      tellThem: `Their account is ready. Log in at nationalfundforwomen.org/auth/login ${howToLogIn}; they'll be taken straight to the next signup step. If they forgot their password, use "Forgot password" on the login page.`,
    };
  }
  if (!row.profile_completed) {
    return {
      status: "profile_incomplete",
      summary: "Has a profile but hasn't finished signup.",
      tellThem: `Log in at nationalfundforwomen.org/auth/login ${howToLogIn} to finish signing up.`,
    };
  }
  return {
    status: "complete",
    summary: "Fully signed up.",
    tellThem: `Log in at nationalfundforwomen.org/auth/login ${howToLogIn}. If they forgot their password, use "Forgot password" on the login page.`,
  };
}

/**
 * GET /api/admin/members/lookup?email=
 *
 * Support lookup by email that reads auth.users, not just profiles, so people
 * whose signup stalled before a profile existed are visible.
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminOrScope("members");
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = (request.nextUrl.searchParams.get("email") ?? "").trim();
  if (!email || email.length > 320 || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a full email address" }, { status: 400 });
  }

  const { data, error } = await getAdminClient().rpc("admin_lookup_auth_user", { target_email: email });
  if (error) {
    console.error("[admin/members/lookup] RPC failed:", error);
    const missing = error.code === "PGRST202" || /admin_lookup_auth_user/.test(error.message);
    return NextResponse.json(
      { error: missing ? "Lookup isn't set up yet: run migration 221." : "Lookup failed" },
      { status: 500 },
    );
  }

  const row = ((data as LookupRow[] | null) ?? [])[0] ?? null;
  return NextResponse.json({ account: row, ...describe(row) });
}

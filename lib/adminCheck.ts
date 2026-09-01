import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface RequireAdminOptions {
  /** If true, redirects to login/home instead of returning error object (for pages) */
  redirectOnFailure?: boolean;
  /** Login redirect path (default: /auth/login) */
  loginRedirect?: string;
  /** Admin redirect path (default: /) */
  adminRedirect?: string;
}

interface RequireAdminResult {
  authorized: boolean;
  user: any;
  profile: any;
  isAdmin: boolean;
  isReviewer: boolean;
}

/**
 * Require admin OR reviewer access - for grant scoring pages
 */
export async function requireGrantsAccess(options: RequireAdminOptions = {}): Promise<RequireAdminResult> {
  const { redirectOnFailure = false, loginRedirect = "/auth/login", adminRedirect = "/" } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (redirectOnFailure) {
      redirect(loginRedirect);
    }
    return { authorized: false, user: null, profile: null, isAdmin: false, isReviewer: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_reviewer")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;
  const isReviewer = profile?.is_reviewer === true;

  if (!isAdmin && !isReviewer) {
    if (redirectOnFailure) {
      redirect(adminRedirect);
    }
    return { authorized: false, user: null, profile: null, isAdmin: false, isReviewer: false };
  }

  return { user, profile, authorized: true, isAdmin, isReviewer };
}

/**
 * Require admin access only - for admin-only pages
 */
export async function requireAdmin(options: RequireAdminOptions = {}): Promise<RequireAdminResult> {
  const { redirectOnFailure = false, loginRedirect = "/auth/login", adminRedirect = "/" } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (redirectOnFailure) {
      redirect(loginRedirect);
    }
    return { authorized: false, user: null, profile: null, isAdmin: false, isReviewer: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_reviewer")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;
  const isReviewer = profile?.is_reviewer === true;

  if (!isAdmin) {
    if (redirectOnFailure) {
      redirect(adminRedirect);
    }
    return { authorized: false, user: null, profile: null, isAdmin: false, isReviewer };
  }

  return { user, profile, authorized: true, isAdmin: true, isReviewer };
}

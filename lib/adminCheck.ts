import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { normalizeAdminScopes, type AdminScope } from "@/lib/admin-scopes";

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
  const { redirectOnFailure = false, loginRedirect = "/auth/login", adminRedirect = "/admin/grants" } = options;

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

/**
 * Reads is_admin / is_reviewer / admin_scopes for the current user's own row.
 * Falls back to the pre-207 columns if admin_scopes doesn't exist yet, so
 * full admins are never locked out by deploy/migration ordering.
 */
async function loadAccessProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ is_admin: boolean; is_reviewer: boolean; admin_scopes: AdminScope[] } | null> {
  const withScopes = await supabase
    .from("profiles")
    .select("is_admin, is_reviewer, admin_scopes")
    .eq("id", userId)
    .maybeSingle();

  let row: { is_admin?: boolean | null; is_reviewer?: boolean | null; admin_scopes?: unknown } | null =
    withScopes.data;

  if (withScopes.error) {
    const legacy = await supabase
      .from("profiles")
      .select("is_admin, is_reviewer")
      .eq("id", userId)
      .maybeSingle();
    row = legacy.data;
  }

  if (!row) return null;
  return {
    is_admin: row.is_admin === true,
    is_reviewer: row.is_reviewer === true,
    admin_scopes: normalizeAdminScopes(row.admin_scopes),
  };
}

export interface AdminAccess {
  user: User;
  isAdmin: boolean;
  isReviewer: boolean;
  /** Scopes from profiles.admin_scopes (migration 207). Empty for full admins' purposes. */
  scopes: AdminScope[];
}

/** Current user's admin access, or null if signed out. Does not redirect. */
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await loadAccessProfile(supabase, user.id);
  return {
    user,
    isAdmin: profile?.is_admin === true,
    isReviewer: profile?.is_reviewer === true,
    scopes: profile?.admin_scopes ?? [],
  };
}

/**
 * Require full admin OR the given scope (profiles.admin_scopes).
 * Use only on pages/routes that are safe for scoped users — write actions
 * should still call requireAdmin(), or check result.isAdmin.
 */
export async function requireAdminOrScope(
  scope: AdminScope,
  options: RequireAdminOptions = {},
): Promise<RequireAdminResult & { scopes: AdminScope[] }> {
  const { redirectOnFailure = false, loginRedirect = "/auth/login", adminRedirect = "/" } = options;

  const access = await getAdminAccess();
  if (!access) {
    if (redirectOnFailure) redirect(loginRedirect);
    return { authorized: false, user: null, profile: null, isAdmin: false, isReviewer: false, scopes: [] };
  }

  const authorized = access.isAdmin || access.scopes.includes(scope);
  if (!authorized) {
    if (redirectOnFailure) redirect(adminRedirect);
    return {
      authorized: false,
      user: null,
      profile: null,
      isAdmin: false,
      isReviewer: access.isReviewer,
      scopes: access.scopes,
    };
  }

  return {
    authorized: true,
    user: access.user,
    profile: { is_admin: access.isAdmin, is_reviewer: access.isReviewer, admin_scopes: access.scopes },
    isAdmin: access.isAdmin,
    isReviewer: access.isReviewer,
    scopes: access.scopes,
  };
}

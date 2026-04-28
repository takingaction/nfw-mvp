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
}

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
    return { authorized: false, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    if (redirectOnFailure) {
      redirect(adminRedirect);
    }
    return { authorized: false, user: null, profile: null };
  }

  return { user, profile, authorized: true };
}
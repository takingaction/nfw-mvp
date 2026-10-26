import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeAdminScopes, scopedPathAllowed } from "@/lib/admin-scopes";
import {
  VAULT_COOKIE,
  heldFor,
  isVaultEligiblePath,
  readVault,
  splitSensitive,
  vaultCookieOptions,
  withParams,
  writeVault,
} from "@/lib/url-vault";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPageRequest =
    (request.method === "GET" || request.method === "HEAD") && isVaultEligiblePath(pathname);

  // Keep sensitive values (waitlist tokens, gift codes, IDs) out of page
  // addresses, where analytics and ad tags would record them. Done before any
  // session work, so no refreshed auth cookies are dropped by this redirect.
  // See lib/url-vault.ts.
  if (isPageRequest) {
    const split = splitSensitive(request.nextUrl);
    if (split) {
      const vault = readVault(request.cookies.get(VAULT_COOKIE)?.value);
      const res = NextResponse.redirect(split.cleanUrl, 303);
      res.cookies.set(VAULT_COOKIE, writeVault(vault, pathname, split.held), vaultCookieOptions);
      res.headers.set("Cache-Control", "private, no-store");
      res.headers.set("Referrer-Policy", "no-referrer");
      return res;
    }
  }

  // Forward the pathname to server components as a request header (the root
  // layout reads it). Rebuilt after any cookie refresh so refreshed auth
  // cookies are forwarded too.
  const forwardedHeaders = () => {
    const h = new Headers(request.headers);
    h.set("x-pathname", pathname);
    return h;
  };

  let supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders() } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders() } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session cookie and read the signed-in user.
  // getClaims() verifies the access-token JWT locally against the project's
  // cached JWKS when the project uses asymmetric signing keys, instead of a
  // round trip to /auth/v1/user on every request (getUser() here was most of
  // the ~100k-150k /auth/v1/user calls a day). With legacy HS256 keys it falls
  // back to the same network call getUser() made, so it is never worse.
  // Route handlers and admin pages still authorize with getUser()/requireAdmin().
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId: string | null = claimsData?.claims?.sub ?? null;

  // Handle orphaned session (user deleted from auth.users but still has cookies)
  // Only redirect for protected routes, not general pages (they handle their own redirects)
  const isAdminPage = pathname.startsWith("/admin");
  // Edge guard for admin API routes. Individual routes also enforce requireAdmin(),
  // but this ensures no /api/admin/* handler is reachable without an admin/reviewer
  // session even if a route forgets to check the result.
  const isAdminApi = pathname.startsWith("/api/admin");
  const isProtectedRoute = isAdminPage || isAdminApi;

  if (isProtectedRoute && !userId) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isProtectedRoute && !authError && userId) {
    // Check if user is admin or reviewer (reviewers need the grant-scoring APIs;
    // admin-only routes enforce is_admin themselves via requireAdmin()).
    // Scoped users (profiles.admin_scopes, migration 207) only get the paths
    // their scopes list in lib/admin-scopes.ts, plus the /admin hub.
    const profileResult = await supabase
      .from("profiles")
      .select("is_admin, is_reviewer, admin_scopes")
      .eq("id", userId)
      .single<{ is_admin: boolean | null; is_reviewer: boolean | null; admin_scopes?: unknown }>();
    let profile = profileResult.data;
    if (profileResult.error) {
      // admin_scopes not migrated yet: don't lock out admins/reviewers.
      ({ data: profile } = await supabase
        .from("profiles")
        .select("is_admin, is_reviewer")
        .eq("id", userId)
        .single<{ is_admin: boolean | null; is_reviewer: boolean | null; admin_scopes?: unknown }>());
    }

    const scopedAllowed = scopedPathAllowed(
      normalizeAdminScopes(profile?.admin_scopes),
      pathname,
    );

    if (!profile?.is_admin && !profile?.is_reviewer && !scopedAllowed) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Handle orphaned session for protected routes only
  // Only log auth errors for /admin/* routes - not for public pages
  if (isProtectedRoute && !userId && authError) {
    console.error("[Proxy] Auth error:", authError.message);
    // Clear auth cookies and let the page handle its own redirect logic
    const response = NextResponse.next({ request });
    response.cookies.set("sb-access-token", "", { path: "/", expires: new Date(0) });
    response.cookies.set("sb-refresh-token", "", { path: "/", expires: new Date(0) });
    response.cookies.set("supabase-auth-token", "", { path: "/", expires: new Date(0) });
    return response;
  }

  // Set pathname header
  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);

  // Values held back from this page's address: hand them to the page
  // server-side, keeping the browser address clean.
  if (isPageRequest) {
    const held = heldFor(readVault(request.cookies.get(VAULT_COOKIE)?.value), request.nextUrl);
    if (held) {
      const rewritten = NextResponse.rewrite(withParams(request.nextUrl, held), {
        request: { headers: forwardedHeaders() },
      });
      supabaseResponse.cookies.getAll().forEach((cookie) => rewritten.cookies.set(cookie));
      rewritten.headers.set("x-pathname", pathname);
      rewritten.headers.set("Cache-Control", "private, no-store");
      return rewritten;
    }
  }

  // View-as cache control (defense in depth).
  // We use cookie-based view-as now (?view_as= is gone from the URL), so this
  // rule is dormant in the current flow. It remains in case any future
  // surface reintroduces the param, or for legacy URLs that still carry it.
  // Detection via URL only — the HttpOnly cookie is invisible to middleware.
  if (request.nextUrl.searchParams.has("view_as")) {
    supabaseResponse.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0",
    );
    supabaseResponse.headers.set("Pragma", "no-cache");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static assets, and server-to-server endpoints that never carry a
    // user session (Vercel cron, Stripe/Shopify/Resend webhooks), so they don't
    // pay for a session check.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/cron/|api/webhook|api/shopify/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|mp4|webm|woff2?|ttf|css|js|map|txt|xml)$).*)",
  ],
};
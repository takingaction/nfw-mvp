import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Handle orphaned session (user deleted from auth.users but still has cookies)
  // Only redirect for protected routes, not general pages (they handle their own redirects)
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth/");

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isProtectedRoute && !authError && user) {
    // Check if user is admin or reviewer
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, is_reviewer")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_reviewer) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Handle orphaned session for protected routes only
  // Only log auth errors for /admin/* routes - not for public pages
  if (isProtectedRoute && !user && authError) {
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
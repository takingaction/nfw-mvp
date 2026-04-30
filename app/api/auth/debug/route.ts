import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Get all cookies for debugging
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(c => c.name);
    
    // Check for auth token specifically
    const authTokenCookie = allCookies.find(c => c.name.includes('auth-token') || c.name.includes('sb-auth'));
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    let profile = null;
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, is_admin, membership_level")
        .eq("id", user.id)
        .single();
      profile = data;
    }

    return NextResponse.json({
      hasUser: !!user,
      userId: user?.id || null,
      userEmail: user?.email || null,
      userMetadata: user?.user_metadata || null,
      profile,
      cookieNames,
      hasAuthToken: !!authTokenCookie,
      authTokenName: authTokenCookie?.name || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

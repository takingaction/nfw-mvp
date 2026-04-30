import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
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
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, is_admin, membership_level, profile_completed")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    // Normalize null membership_level to "free" for consistency
    const normalizedProfile = {
      ...profile,
      membership_level: profile?.membership_level || "free",
    };

    return NextResponse.json(normalizedProfile);
  } catch (error) {
    console.error("Profile route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

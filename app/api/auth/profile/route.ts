import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// In-memory cache to reduce redundant profile fetches
// Key: userId, Value: { data, timestamp }
let profileCache: { [userId: string]: { data: any; timestamp: number } } = {};
const CACHE_TTL_MS = 30000; // 30 seconds

function getCachedProfile(userId: string) {
  const cached = profileCache[userId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedProfile(userId: string, data: any) {
  profileCache[userId] = { data, timestamp: Date.now() };
}

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

    // Check cache first
    const cachedData = getCachedProfile(user.id);
    if (cachedData) {
      return NextResponse.json(cachedData);
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

    // Cache the result
    setCachedProfile(user.id, normalizedProfile);

    return NextResponse.json(normalizedProfile);
  } catch (error) {
    console.error("Profile route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

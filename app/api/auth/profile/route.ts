import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    const { data: { user } } = await supabase.auth.getUser();

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
      .select("id, full_name, is_admin, membership_level, profile_completed, is_approved_free_member, free_membership_contact_submitted")
      .eq("id", user.id)
      .single();

    // If profile doesn't exist, create a defensive minimal profile
    if (!profile && !error) {
      const rawMeta = user.user_metadata || {};
      const isGoogle = rawMeta.iss === 'https://accounts.google.com';

      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          full_name: isGoogle ? (rawMeta.full_name || "Member") : "Member",
          membership_level: "free",
          profile_completed: false,
          is_approved_free_member: false,
          free_membership_contact_submitted: false,
          date_of_birth: "1900-01-01",
        });

      if (insertError) {
        console.error("Failed to create defensive profile:", insertError);
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
      }

      // Fetch the newly created profile
      const { data: newProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, is_admin, membership_level, profile_completed, is_approved_free_member, free_membership_contact_submitted")
        .eq("id", user.id)
        .single();

      if (fetchError || !newProfile) {
        console.error("Failed to fetch newly created profile:", fetchError);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
      }

      const normalizedProfile = {
        ...newProfile,
        membership_level: newProfile.membership_level || "free",
      };
      setCachedProfile(user.id, normalizedProfile);
      return NextResponse.json(normalizedProfile);
    }

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

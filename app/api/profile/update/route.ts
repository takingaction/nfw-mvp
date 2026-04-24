import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_FIELDS = [
  "full_name",
  "avatar_url",
  "bio",
  "zip",
  "city",
  "state",
  "phone_number",
  "date_of_birth",
  "occupation",
  "industry",
  "company_name",
  "company_website",
  "linkedin_url",
  "twitter_handle",
  "address_line1",
  "address_line2",
  "household_income",
  "identities",
  "social_handles",
  "profile_completed",
  "membership_level",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

const ALLOWED_ARRAYS = ["identities"];
const ALLOWED_OBJECTS = ["social_handles"];
const ALLOWED_BOOLEANS = ["profile_completed"];

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`profile-update:${ip}`, 10, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const updates: Record<string, any> = {};

    for (const key of Object.keys(body) as string[]) {
      const value = body[key];
      if (value === undefined || value === null) continue;

      if (ALLOWED_BOOLEANS.includes(key)) {
        updates[key] = Boolean(value);
      } else if (ALLOWED_ARRAYS.includes(key)) {
        updates[key] = Array.isArray(value) ? value : [];
      } else if (ALLOWED_OBJECTS.includes(key)) {
        updates[key] = typeof value === 'object' ? value : {};
      } else if (ALLOWED_FIELDS.includes(key as AllowedField)) {
        updates[key] = String(value);
      }
    }

    if (!updates.date_of_birth) {
      updates.date_of_birth = "1900-01-01";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Check if profile exists first
    console.log("[ProfileUpdate] User ID:", user.id);
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    console.log("[ProfileUpdate] Existing profile:", existingProfile);

    let error;
    if (existingProfile) {
      // Profile exists - use UPDATE
      const result = await supabaseAdmin
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      error = result.error;
    } else {
      // Profile doesn't exist - INSERT with all required fields
      const result = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          ...updates,
          full_name: updates.full_name || "Member",
          updated_at: new Date().toISOString(),
        });
      error = result.error;
    }

    if (error) {
      console.error("Profile update error:", error);
      console.error("Updates attempted:", updates);
      return NextResponse.json(
        { error: "Failed to update profile", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}

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
  "age_range",
  "address_line1",
  "address_line2",
  "household_income",
  "identities",
  "social_handles",
  "profile_completed",
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
      if (ALLOWED_BOOLEANS.includes(key)) {
        updates[key] = Boolean(body[key]);
      } else if (ALLOWED_ARRAYS.includes(key)) {
        updates[key] = Array.isArray(body[key]) ? body[key] : [];
      } else if (ALLOWED_OBJECTS.includes(key)) {
        updates[key] = typeof body[key] === 'object' ? body[key] : {};
      } else if (ALLOWED_FIELDS.includes(key as AllowedField)) {
        updates[key] = String(body[key]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Profile update error:", error);
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

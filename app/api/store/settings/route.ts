import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("store_settings")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || null);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { hero_image_url, hero_heading, hero_subheading } = body;

    // Check if row exists
    const { data: existing } = await supabaseAdmin
      .from("store_settings")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      // Update existing row
      const { error } = await supabaseAdmin
        .from("store_settings")
        .update({
          hero_image_url: hero_image_url || null,
          hero_heading: hero_heading || 'ZERO DOLLAR STORE',
          hero_subheading: hero_subheading || 'Browse our selection',
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Store settings update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id: existing.id });
    } else {
      // Insert new row
      const { data, error } = await supabaseAdmin
        .from("store_settings")
        .insert([{
          hero_image_url: hero_image_url || null,
          hero_heading: hero_heading || 'ZERO DOLLAR STORE',
          hero_subheading: hero_subheading || 'Browse our selection',
        }])
        .select()
        .single();

      if (error) {
        console.error("Store settings insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id: data.id });
    }
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

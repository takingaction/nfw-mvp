import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ robots_txt: "User-agent: *\nAllow: /" });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching site settings:", err);
    return NextResponse.json(
      { error: "Failed to fetch site settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { robots_txt } = body;

    if (typeof robots_txt !== "string") {
      return NextResponse.json(
        { error: "robots_txt is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ 
        robots_txt,
        updated_at: new Date().toISOString()
      })
      .eq("id", "00000000-0000-0000-0000-000000000001");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating site settings:", err);
    return NextResponse.json(
      { error: "Failed to update site settings" },
      { status: 500 }
    );
  }
}

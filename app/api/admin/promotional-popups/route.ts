import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: popups, error } = await supabase
      .from("promotional_popups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ popups: popups || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      body: popupBody,
      image_url,
      cta_text,
      cta_url,
      target_pages,
      frequency_type,
      frequency_value,
      delay_seconds,
      is_active,
      start_date,
      end_date,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: popup, error } = await supabase
      .from("promotional_popups")
      .insert({
        title,
        body: popupBody,
        image_url,
        cta_text,
        cta_url,
        target_pages: target_pages || [],
        frequency_type: frequency_type || "once",
        frequency_value: frequency_value || 1,
        delay_seconds: delay_seconds || 0,
        is_active: is_active || false,
        start_date,
        end_date,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ popup });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

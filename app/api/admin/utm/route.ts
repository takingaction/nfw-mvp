import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const { data: links, error } = await supabase
    .from("utm_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { destination_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, channel_id, channel_name, campaign_title } = body;

  if (!destination_url || !utm_source || !utm_medium || !utm_campaign) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: link, error } = await supabase
    .from("utm_links")
    .insert({
      destination_url,
      utm_source,
      utm_medium,
      utm_campaign,
      campaign_title: campaign_title || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      channel_id: channel_id || null,
      channel_name: channel_name || null,
      created_by: user.id,
      created_by_email: profile.email,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: channels, error } = await supabase
    .from("utm_channels")
    .select(`
      *,
      utm_sources (*),
      utm_mediums (*)
    `)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channels });
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const { name, slug, sources, mediums } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  // Insert channel
  const { data: channel, error: channelError } = await supabase
    .from("utm_channels")
    .insert({ name, slug })
    .select()
    .single();

  if (channelError) {
    return NextResponse.json({ error: channelError.message }, { status: 500 });
  }

  // Insert sources if provided
  if (sources && sources.length > 0) {
    const sourceInserts = sources.map((s: string) => ({
      channel_id: channel.id,
      name: s,
      slug: s.toLowerCase().replace(/\s+/g, "_"),
    }));
    await supabase.from("utm_sources").insert(sourceInserts);
  }

  // Insert mediums if provided
  if (mediums && mediums.length > 0) {
    const mediumInserts = mediums.map((m: string) => ({
      channel_id: channel.id,
      name: m,
      slug: m.toLowerCase().replace(/\s+/g, "_"),
    }));
    await supabase.from("utm_mediums").insert(mediumInserts);
  }

  // Fetch the complete channel with relations
  const { data: completeChannel } = await supabase
    .from("utm_channels")
    .select(`
      *,
      utm_sources (*),
      utm_mediums (*)
    `)
    .eq("id", channel.id)
    .single();

  return NextResponse.json({ channel: completeChannel }, { status: 201 });
}

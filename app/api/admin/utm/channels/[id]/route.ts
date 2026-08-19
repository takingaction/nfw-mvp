import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const body = await request.json();
  const { name, slug, is_active, display_order, sources, mediums } = body;

  // Update channel
  const { data: channel, error: channelError } = await supabase
    .from("utm_channels")
    .update({
      name,
      slug,
      is_active: is_active ?? true,
      display_order: display_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (channelError) {
    return NextResponse.json({ error: channelError.message }, { status: 500 });
  }

  // Update sources if provided
  if (sources !== undefined) {
    // Delete existing sources
    await supabase.from("utm_sources").delete().eq("channel_id", id);
    // Insert new sources
    if (sources.length > 0) {
      const sourceInserts = sources.map((s: string) => ({
        channel_id: id,
        name: s,
        slug: s.toLowerCase().replace(/\s+/g, "_"),
      }));
      await supabase.from("utm_sources").insert(sourceInserts);
    }
  }

  // Update mediums if provided
  if (mediums !== undefined) {
    // Delete existing mediums
    await supabase.from("utm_mediums").delete().eq("channel_id", id);
    // Insert new mediums
    if (mediums.length > 0) {
      const mediumInserts = mediums.map((m: string) => ({
        channel_id: id,
        name: m,
        slug: m.toLowerCase().replace(/\s+/g, "_"),
      }));
      await supabase.from("utm_mediums").insert(mediumInserts);
    }
  }

  // Fetch the complete channel with relations
  const { data: completeChannel } = await supabase
    .from("utm_channels")
    .select(`
      *,
      utm_sources (*),
      utm_mediums (*)
    `)
    .eq("id", id)
    .single();

  return NextResponse.json({ channel: completeChannel });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  const { error } = await supabase
    .from("utm_channels")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

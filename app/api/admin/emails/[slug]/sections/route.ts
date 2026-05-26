import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminCheck";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("slug", slug)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get sections
  const { data: sections, error: sectionsError } = await supabase
    .from("email_sections")
    .select("*")
    .eq("email_template_id", template.id)
    .order("order_index", { ascending: true });

  if (sectionsError) {
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }

  return NextResponse.json({ template, sections: sections || [] });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json();
  const { sections } = body;

  const supabase = await createClient();
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!sections || !Array.isArray(sections)) {
    return NextResponse.json({ error: "Invalid sections data" }, { status: 400 });
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id")
    .eq("slug", slug)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Delete existing sections
  const { error: deleteError } = await supabaseAdmin
    .from("email_sections")
    .delete()
    .eq("email_template_id", template.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete existing sections" }, { status: 500 });
  }

  // Insert new sections
  if (sections.length > 0) {
    const sectionsToInsert = sections.map((s: { id: string; section_type: string; order_index: number; content: Record<string, unknown>; visible: boolean; background_color?: string }) => ({
      id: s.id || crypto.randomUUID(),
      email_template_id: template.id,
      section_type: s.section_type,
      order_index: s.order_index,
      content: s.content,
      visible: s.visible,
      background_color: s.background_color || null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("email_sections")
      .insert(sectionsToInsert);

    if (insertError) {
      return NextResponse.json({ error: "Failed to save sections" }, { status: 500 });
    }
  }

  // Update template updated_at
  await supabase
    .from("email_templates")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", template.id);

  return NextResponse.json({ success: true });
}
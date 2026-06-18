import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Check admin
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

    const { data: template, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("[api/admin/emails/[slug]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { subject, html_content, hero_image_url, is_active } = body;

    const supabase = await createClient();

    // Check admin
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

    // Check if template is editable
    const { data: existing } = await supabase
      .from("email_templates")
      .select("is_editable, category")
      .eq("slug", slug)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existing.category === "supabase") {
      return NextResponse.json(
        { error: "Supabase templates cannot be edited here. Copy HTML and paste into Supabase Dashboard." },
        { status: 400 }
      );
    }

    if (!existing.is_editable) {
      return NextResponse.json(
        { error: "This template is not editable." },
        { status: 400 }
      );
    }

    // Update template
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (subject !== undefined) updates.subject = subject;
    if (html_content !== undefined) updates.html_content = html_content;
    if (hero_image_url !== undefined) updates.hero_image_url = hero_image_url || null;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: template, error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("slug", slug)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("[api/admin/emails/[slug]] PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
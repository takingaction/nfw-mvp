import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminCheck";
import { renderAllBlocks } from "@/lib/email-blocks/renderer";
import { buildEmailShell } from "@/lib/email-blocks/shell";
import type { EmailSection } from "@/lib/email-blocks/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, slug, subject, hero_image_url")
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
    .eq("visible", true)
    .order("order_index", { ascending: true });

  if (sectionsError) {
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }

  // Render all blocks
  const sectionsHtml = renderAllBlocks(sections as EmailSection[]);

  // Build full HTML with shell
  const fullHtml = buildEmailShell({
    sectionsHtml,
  });

  // Update template with full HTML and set status to published
  const { error: updateError } = await supabase
    .from("email_templates")
    .update({
      full_email_html: fullHtml,
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", template.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to save HTML" }, { status: 500 });
  }

  return NextResponse.json({ success: true, full_html: fullHtml });
}
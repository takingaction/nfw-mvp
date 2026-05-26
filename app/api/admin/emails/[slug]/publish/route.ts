import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/adminCheck";
import { renderAllBlocks } from "@/lib/email-blocks/renderer";
import { buildEmailShell } from "@/lib/email-blocks/shell";
import type { EmailSection } from "@/lib/email-blocks/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  console.log("[publish] POST called with slug:", slug);

  const supabase = await createClient();
  const admin = await requireAdmin();

  if (!admin.authorized) {
    console.log("[publish] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, slug, subject, hero_image_url")
    .eq("slug", slug)
    .single();

  console.log("[publish] template fetch result:", { templateId: template?.id, templateError });

  if (templateError || !template) {
    console.log("[publish] template not found");
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get sections
  const { data: sections, error: sectionsError } = await supabase
    .from("email_sections")
    .select("*")
    .eq("email_template_id", template.id)
    .eq("visible", true)
    .order("order_index", { ascending: true });

  console.log("[publish] sections fetch result:", { count: sections?.length, sectionsError, sectionIds: sections?.map(s => s.id) });

  if (sectionsError) {
    console.log("[publish] sections fetch error:", sectionsError);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }

  console.log("[publish] sections fetched:", sections?.length, "error:", sectionsError);
  if (sections && sections.length > 0) {
    console.log("[publish] first section:", JSON.stringify(sections[0]));
    console.log("[publish] section types:", sections.map(s => s.section_type).join(", "));
  } else {
    console.log("[publish] NO SECTIONS FOUND - this is likely the problem!");
  }

  // Render all blocks
  console.log("[publish] about to call renderAllBlocks with", sections?.length, "sections");
  const sectionsHtml = renderAllBlocks(sections as EmailSection[]);
  console.log("[publish] sectionsHtml result:", {
    length: sectionsHtml.length,
    isEmpty: sectionsHtml.length === 0,
    first500: sectionsHtml.substring(0, 500)
  });

  // Build full HTML with shell
  const fullHtml = buildEmailShell({
    sectionsHtml,
  });
  console.log("[publish] fullHtml length:", fullHtml.length);

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
    console.log("[publish] update error:", updateError);
    return NextResponse.json({ error: "Failed to save HTML" }, { status: 500 });
  }

  console.log("[publish] SUCCESS - fullHtml length:", fullHtml.length);
  return NextResponse.json({ success: true, full_html: fullHtml });
}
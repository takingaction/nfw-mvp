import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { renderAllBlocks } from "@/lib/email-blocks/renderer";
import { buildEmailShell } from "@/lib/email-blocks/shell";
import type { EmailSection } from "@/lib/email-blocks/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const previewData = body.preview_data || {};

  const supabase = await createClient();

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, slug, subject, hero_image_url")
    .eq("slug", slug)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get sections using admin client (bypasses RLS)
  const { data: sections, error: sectionsError } = await supabaseAdmin
    .from("email_sections")
    .select("*")
    .eq("email_template_id", template.id)
    .eq("visible", true)
    .order("order_index", { ascending: true });

  // Render all blocks
  const sectionsHtml = renderAllBlocks(sections as EmailSection[]);

  // Build full HTML with shell
  const fullHtml = buildEmailShell({
    sectionsHtml,
  });

  // Apply preview variables if provided
  let finalHtml = fullHtml;
  for (const [key, value] of Object.entries(previewData)) {
    finalHtml = finalHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }

  return NextResponse.json({ success: true, html: finalHtml });
}
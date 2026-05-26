import { createClient } from "@/lib/supabase/server";
import { renderAllBlocks } from "./renderer";
import { buildEmailShell } from "./shell";
import type { EmailSection } from "./types";

export interface PublishOptions {
  templateSlug: string;
}

export async function publishEmail(options: PublishOptions): Promise<{ success: boolean; full_html?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, slug, subject, hero_image_url")
    .eq("slug", options.templateSlug)
    .single();

  if (templateError || !template) {
    return { success: false, error: "Template not found" };
  }

  // Fetch sections for this template
  const { data: sections, error: sectionsError } = await supabase
    .from("email_sections")
    .select("*")
    .eq("email_template_id", template.id)
    .eq("visible", true)
    .order("order_index", { ascending: true });

  if (sectionsError) {
    return { success: false, error: "Failed to fetch sections" };
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
    return { success: false, error: "Failed to save full HTML" };
  }

  return { success: true, full_html: fullHtml };
}

export async function previewEmail(
  templateSlug: string,
  previewData: Record<string, string> = {}
): Promise<{ success: boolean; html?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, slug, subject, hero_image_url, preview_data")
    .eq("slug", templateSlug)
    .single();

  if (templateError || !template) {
    return { success: false, error: "Template not found" };
  }

  // Fetch sections for this template
  const { data: sections, error: sectionsError } = await supabase
    .from("email_sections")
    .select("*")
    .eq("email_template_id", template.id)
    .eq("visible", true)
    .order("order_index", { ascending: true });

  if (sectionsError) {
    return { success: false, error: "Failed to fetch sections" };
  }

  // Render all blocks
  const sectionsHtml = renderAllBlocks(sections as EmailSection[]);

  // Build full HTML with shell
  const fullHtml = buildEmailShell({
    sectionsHtml,
  });

  // Apply preview variables if provided
  let finalHtml = fullHtml;
  for (const [key, value] of Object.entries(previewData)) {
    finalHtml = finalHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return { success: true, html: finalHtml };
}
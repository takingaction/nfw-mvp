import { createClient } from "@/lib/supabase/server";
import getAdminClient from "@/lib/supabase/admin";
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

export interface PreRenderedEmailResult {
  html: string;
  useShell: boolean;
  subject: string;
}

export async function getPreRenderedHtml(
  templateSlug: string,
  variables: Record<string, string> = {}
): Promise<PreRenderedEmailResult | null> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, slug, subject, full_email_html, status, is_active")
    .eq("slug", templateSlug)
    .single();

  if (templateError || !template) {
    return null;
  }

  if (template.full_email_html && template.status === "published" && template.is_active !== false) {
    let html = template.full_email_html;
    let subject = template.subject || "";
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return {
      html,
      useShell: false,
      subject,
    };
  }

  return null;
}

export async function getPreRenderedHtmlAdmin(
  templateSlug: string,
  variables: Record<string, string> = {}
): Promise<PreRenderedEmailResult | null> {
  const supabase = getAdminClient();

  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, slug, subject, full_email_html, status, is_active")
    .eq("slug", templateSlug)
    .single();

  if (templateError || !template) {
    return null;
  }

  if (template.full_email_html && template.status === "published" && template.is_active !== false) {
    let html = template.full_email_html;
    let subject = template.subject || "";
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return {
      html,
      useShell: false,
      subject,
    };
  }

  return null;
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
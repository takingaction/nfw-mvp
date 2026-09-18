import { createClient } from "@/lib/supabase/server";
import getAdminClient from "@/lib/supabase/admin";
import { renderAllBlocks } from "./renderer";
import { buildEmailShell } from "./shell";
import { parseInlineFormatting } from "./formatting";
import type { EmailSection } from "./types";

// Email HTML rendering: substitute {{var}} placeholders in `full_email_html`
// (or any pre-rendered HTML) with values from application logic, translating
// any markdown in the values.

interface SubstitutedResult {
  html: string;
  subject: string;
}

/**
 * Substitute {{var}} placeholders in email HTML with values, translating
 * any markdown in the values (bold, italic, links).
 *
 * Single source of truth for variable substitution in email rendering.
 * Used by:
 *   - `getPreRenderedHtml`       (live single send via sendEmailBySlug)
 *   - `getPreRenderedHtmlAdmin`  (admin test send)
 *   - `lib/email-batch.ts`       (batch send: final-approve rejections,
 *                                 waitlist welcomes)
 *
 * Algorithm: run `parseInlineFormatting` on each value UP FRONT, then
 * substitute the translated value into the publisher HTML via plain string
 * replace. The publisher HTML is never re-scanned for markdown — values
 * arrive already translated. No sentinels, no bookkeeping, no
 * byte-for-byte matching that could fail if `parseInlineFormatting`
 * transformed a value's characters during step 2.
 *
 * Subject lines intentionally receive the RAW value (no translation) to
 * preserve prior behavior — no current template uses markdown in subject
 * variables, and silently translating subject lines could surprise template
 * authors.
 *
 * Why not the sentinel approach (the previous implementation):
 *   The sentinel-token post-pass was over-engineered for a problem that
 *   doesn't exist when you translate values up front. The sentinel strip
 *   step required exact byte-for-byte matching between `sentinel.value`
 *   and the substituted text in the document. If `parseInlineFormatting`
 *   transformed a value (e.g. `[here](url)` → `<a>...</a>`), the strip
 *   target no longer matched the document content and the raw sentinels
 *   leaked into the delivered email. The simpler up-front-translate
 *   approach is strictly equivalent for plain-text values and strictly
 *   correct for markdown values.
 */
export function substituteAndTranslate(html: string, subject: string, variables: Record<string, string>): SubstitutedResult {
  let result = html;
  let resultSubject = subject;

  for (const [key, value] of Object.entries(variables)) {
    // Build a value-safe JS-regex source (escapes $.^ etc.)
    const pattern = new RegExp(
      `\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`,
      "g"
    );
    // Translate the value once. parseInlineFormatting safely passes through
    // values without markdown (`**`/`*`/`[]()` patterns).
    const translatedValue = parseInlineFormatting(value);
    result = result.replace(pattern, translatedValue);
    // Subject line uses the RAW value (no translation), matching prior behavior.
    resultSubject = resultSubject.replace(pattern, value);
  }

  return { html: result, subject: resultSubject };
}

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
    const subject = template.subject || "";
    const { html, subject: finalSubject } = substituteAndTranslate(
      template.full_email_html,
      subject,
      variables
    );
    return {
      html,
      useShell: false,
      subject: finalSubject,
    };
  }

  return null;
}

export async function getPreRenderedHtmlAdmin(
  templateSlug: string,
  variables: Record<string, string> = {},
  options: { skipActiveCheck?: boolean } = {}
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

  const isActiveCheckPasses = options.skipActiveCheck || template.is_active !== false;
  if (template.full_email_html && template.status === "published" && isActiveCheckPasses) {
    const subject = template.subject || "";
    const { html, subject: finalSubject } = substituteAndTranslate(
      template.full_email_html,
      subject,
      variables
    );
    return {
      html,
      useShell: false,
      subject: finalSubject,
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
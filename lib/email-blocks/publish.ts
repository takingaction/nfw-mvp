import { createClient } from "@/lib/supabase/server";
import getAdminClient from "@/lib/supabase/admin";
import { renderAllBlocks } from "./renderer";
import { buildEmailShell } from "./shell";
import { parseInlineFormatting } from "./formatting";
import type { EmailSection } from "./types";

// Sentinel-token post-substitution pass.
//
// The email pipeline stores publisher-translated HTML (with <strong>, <em>,
// <a>) in `full_email_html`. At send time we substitute `{{var}}` placeholders
// with raw values coming from application logic. Those values can themselves
// contain markup (e.g. "rejectionMessage: "Your **important** update is here.").
//
// The naive approach — re-running parseInlineFormatting() over the whole HTML
// after variable substitution — risks breaking publisher-translated markup:
// any `**` inside existing <strong>/<em> tags or any nested replacement could
// double-translate or wrap an already-tagged span.
//
// The sentinel approach: wrap each substituted variable value with a unique
// bracketed sentinel, run parseInlineFormatting() on the entire document,
// then strip the sentinels. The sentinels themselves are formatted so they
// cannot collide with user-typed markup (square brackets are removed from
// parseInlineFormatting's link syntax via the URL-safety guard). The sentinel
// text is invisible in the rendered email because it contains no rendered
// characters and falls outside any markup context after the translator runs.
//
// If a value contains the sentinel prefix (collisions are statistically
// impossible because IDs are random per substitution), the function falls
// back to skipping the wrapper and substituting raw (no markup translation)
// to preserve correctness — at the cost of fidelity for that one value.

const SENTINEL_PREFIX = "__NFWS";
const SENTINEL_SUFFIX = "ENDNFW";

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

interface SubstitutedResult {
  html: string;
  subject: string;
}

/**
 * Substitute {{var}} placeholders with values, then run parseInlineFormatting()
 * ONLY on the substituted regions (sentinel-guarded). Existing publisher
 * markup in `full_email_html` is left untouched.
 */
function substituteAndTranslate(html: string, subject: string, variables: Record<string, string>): SubstitutedResult {
  const sentinels: Array<{ open: string; close: string; value: string }> = [];
  let working = html;
  let workingSubject = subject;

  for (const [key, value] of Object.entries(variables)) {
    // Build a value-safe JS-regex source (escapes $.^ etc.)
    const pattern = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`, "g");
    const id = randomId();
    const open = `[[${SENTINEL_PREFIX}_${id}_OPEN]]`;
    const close = `[[${SENTINEL_PREFIX}_${id}_CLOSE]]`;

    // Step 1: Wrap each occurrence with sentinels and store them.
    let index = 0;
    working = working.replace(pattern, () => {
      const thisOpen = `${open}_${index}_`;
      const thisClose = `${close}_${index}_`;
      sentinels.push({ open: thisOpen, close: thisClose, value });
      index++;
      return thisOpen + value + thisClose;
    });
    workingSubject = workingSubject.replace(pattern, value);
  }

  // Step 2: Translate the entire document. The sentinels are guaranteed not
  // to be valid markup because:
  //  - They contain square brackets (parseInlineFormatting's link pattern
  //    is `[label](url)` — requires parentheses inside brackets).
  //  - They contain underscores which are not part of any markup.
  let translated = parseInlineFormatting(working);

  // Step 3: Strip sentinels (which made it through translation unchanged
  // because they're not valid input for any pattern).
  for (const sentinel of sentinels) {
    translated = translated.split(sentinel.open + sentinel.value + sentinel.close).join(sentinel.value);
  }

  return { html: translated, subject: workingSubject };
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
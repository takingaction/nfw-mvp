import { Resend } from "resend";
import { getPreRenderedHtmlAdmin } from "./email-blocks/publish";
import getAdminClient from "@/lib/supabase/admin";

const FROM = "National Fund for Women <hello@nationalfundforwomen.org>";
const RESEND_BATCH_SIZE = 50; // Resend limit for batch sends
const DEFAULT_DELAY_MS = 200; // Delay between batches to avoid throttling

interface BatchRecipient {
  email: string;
  name?: string;
  variables?: Record<string, string>;
  grantId?: string; // Optional grant ID for logging
}

interface BatchEmailOptions {
  recipients: BatchRecipient[];
  templateSlug: string;
  fromName?: string;
  delayMs?: number;
  onProgress?: (sent: number, total: number) => void;
}

interface BatchEmailResult {
  sent: number;
  failed: number;
  total: number;
  results: {
    email: string;
    success: boolean;
    resendId?: string;
    error?: string;
  }[];
}

/**
 * Chunk array into smaller arrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Replace template variables in HTML content
 */
function replaceTemplateVariables(
  html: string,
  variables: Record<string, string>
): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

/**
 * Fetch email template from database (admin access)
 * Uses builder content (full_email_html with published status) if available,
 * falls back to html_content for legacy templates
 */
async function fetchTemplate(slug: string): Promise<{
  subject: string;
  html: string;
  hero_image_url?: string;
} | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_content, full_email_html, status, hero_image_url, is_active")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error(`[email-batch] Failed to fetch template "${slug}":`, error);
    return null;
  }

  // Use builder content if published, otherwise fall back to html_content
  if (data.full_email_html && data.status === "published" && data.is_active !== false) {
    return {
      subject: data.subject,
      html: data.full_email_html,
      hero_image_url: data.hero_image_url,
    };
  }

  // Fall back to legacy html_content
  if (data.html_content) {
    return {
      subject: data.subject,
      html: data.html_content,
      hero_image_url: data.hero_image_url,
    };
  }

  console.error(`[email-batch] Template "${slug}" has no published content`);
  return null;
}

/**
 * Get Resend client
 */
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Send batch emails sequentially with throttling to avoid 429 errors
 *
 * Sends emails one at a time with a delay between each to stay under
 * Resend's rate limit of 10 requests per second.
 */
export async function sendBatchEmails(
  options: BatchEmailOptions
): Promise<BatchEmailResult> {
  const {
    recipients,
    templateSlug,
    fromName,
    delayMs = 110, // ~9 emails per second to stay under 10/s limit
    onProgress,
  } = options;

  const result: BatchEmailResult = {
    sent: 0,
    failed: 0,
    total: recipients.length,
    results: [],
  };

  if (recipients.length === 0) {
    return result;
  }

  // Fetch template
  const template = await fetchTemplate(templateSlug);
  if (!template) {
    return {
      ...result,
      failed: recipients.length,
      results: recipients.map((r) => ({
        email: r.email,
        success: false,
        error: `Template "${templateSlug}" not found`,
      })),
    };
  }

  console.log(
    `[email-batch] Sending ${recipients.length} emails sequentially with ${delayMs}ms delay`
  );

  const resend = getResend();
  const fromAddress = fromName
    ? `${fromName} <hello@nationalfundforwomen.org>`
    : FROM;

  // Send emails sequentially, one at a time
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const variables = {
      name: recipient.name || "there",
      ...recipient.variables,
    };

    const personalizedHtml = replaceTemplateVariables(
      template.html,
      variables
    );

    const personalizedSubject = replaceTemplateVariables(
      template.subject,
      variables
    );

    try {
      const emailResult = await resend.emails.send({
        from: fromAddress,
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedHtml,
      });

      if (emailResult.error) {
        throw new Error(emailResult.error.message);
      }

      result.sent++;
      result.results.push({
        email: recipient.email,
        success: true,
        resendId: emailResult.data?.id,
      });
    } catch (err: any) {
      result.failed++;
      result.results.push({
        email: recipient.email,
        success: false,
        error: err?.message || "Unknown error",
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(result.sent + result.failed, result.total);
    }

    // Delay between emails (except for last one)
    if (i < recipients.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(
    `[email-batch] Complete: ${result.sent}/${result.total} sent, ${result.failed} failed`
  );

  return result;
}

/**
 * Send a single branded email (wrapper for convenience)
 */
export async function sendBrandedEmailBatch({
  to,
  name,
  subject,
  html,
  fromName,
  replyTo,
}: {
  to: string;
  name: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const resend = getResend();
    const fromAddress = fromName
      ? `${fromName} <hello@nationalfundforwomen.org>`
      : FROM;

    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    });

    if (result.error) {
      console.error("[sendBrandedEmailBatch] Resend error:", result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[sendBrandedEmailBatch] Error:", err);
    return { success: false, error: err };
  }
}

/**
 * Send waitlist welcome email to a single recipient
 */
export async function sendWaitlistWelcomeEmailBatch({
  to,
  name,
  waitlistCount,
}: {
  to: string;
  name: string;
  waitlistCount: number;
}): Promise<{ success: boolean; error?: any }> {
  const templateSlug = "waitlist-welcome";

  // Fetch template
  const template = await fetchTemplate(templateSlug);
  if (!template) {
    return { success: false, error: `Template "${templateSlug}" not found` };
  }

  const variables: Record<string, string> = {
    name: name || "there",
    waitlistCount: waitlistCount.toString(),
    ctaUrl: "https://nationalfundforwomen.org/auth/sign-up?step=3",
    siteUrl: "https://nationalfundforwomen.org",
  };

  const personalizedHtml = replaceTemplateVariables(template.html, variables);
  const personalizedSubject = replaceTemplateVariables(template.subject, variables);

  return sendBrandedEmailBatch({
    to,
    name,
    subject: personalizedSubject,
    html: personalizedHtml,
  });
}

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
  errors: { email: string; error: string }[];
  total: number;
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
 * Send batch emails using Resend's batch API
 * 
 * Resend allows sending to up to 50 recipients per API call.
 * This function chunks recipients and sends in batches with configurable delays.
 */
export async function sendBatchEmails(
  options: BatchEmailOptions
): Promise<BatchEmailResult> {
  const {
    recipients,
    templateSlug,
    fromName,
    delayMs = DEFAULT_DELAY_MS,
    onProgress,
  } = options;

  const result: BatchEmailResult = {
    sent: 0,
    failed: 0,
    errors: [],
    total: recipients.length,
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
      errors: recipients.map((r) => ({
        email: r.email,
        error: `Template "${templateSlug}" not found`,
      })),
    };
  }

  // Chunk recipients into batches of 50
  const batches = chunkArray(recipients, RESEND_BATCH_SIZE);
  const totalBatches = batches.length;

  console.log(
    `[email-batch] Sending ${recipients.length} emails in ${totalBatches} batches`
  );

  const resend = getResend();
  const fromAddress = fromName
    ? `${fromName} <hello@nationalfundforwomen.org>`
    : FROM;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchNum = batchIndex + 1;

    try {
      // For each recipient in batch, prepare personalized HTML
      // Note: Resend batch send uses same HTML for all recipients in batch
      // To personalize, we need to either:
      // 1. Use Resend's personalization (not available in basic API)
      // 2. Send individual emails with personalized content
      //
      // Since we need personalization, we'll send individually within the batch
      // but use Promise.all for concurrency within the batch
      const batchPromises = batch.map(async (recipient) => {
        const variables = {
          name: recipient.name || "there",
          ...recipient.variables,
        };

        const personalizedHtml = replaceTemplateVariables(
          template.html,
          variables
        );

        // Replace name in subject too if {{name}} is present
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

          return { success: true, email: recipient.email };
        } catch (err: any) {
          return {
            success: false,
            email: recipient.email,
            error: err?.message || "Unknown error",
          };
        }
      });

      // Send batch concurrently
      const batchResults = await Promise.all(batchPromises);

      // Process results
      for (const res of batchResults) {
        if (res.success) {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push({ email: res.email, error: res.error });
        }
      }

      console.log(
        `[email-batch] Batch ${batchNum}/${totalBatches} complete: ${batchResults.filter((r) => r.success).length}/${batch.length} sent`
      );

      // Report progress
      if (onProgress) {
        onProgress(result.sent + result.failed, result.total);
      }

      // Delay between batches (except for last batch)
      if (batchIndex < batches.length - 1) {
        await sleep(delayMs);
      }
    } catch (err: any) {
      console.error(`[email-batch] Batch ${batchNum} failed:`, err);
      // Mark all in batch as failed
      for (const recipient of batch) {
        result.failed++;
        result.errors.push({
          email: recipient.email,
          error: err?.message || `Batch ${batchNum} failed`,
        });
      }
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

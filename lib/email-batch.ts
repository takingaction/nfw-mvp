import { Resend } from "resend";
import { getPreRenderedHtmlAdmin, substituteAndTranslate } from "./email-blocks/publish";
import getAdminClient from "@/lib/supabase/admin";
import {
  RESEND_BATCH_MAX,
  chunk,
  chunkIdempotencyKey,
  failChunk,
  mapBatchResponse,
  type ChunkResult,
} from "./email-batch-chunks";

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
  const query = () =>
    supabase
      .from("email_templates")
      .select("subject, html_content, full_email_html, status, hero_image_url, is_active")
      .eq("slug", slug)
      .single();
  let { data, error } = await query();
  // PGRST116 = no row (genuinely missing). Retry anything else once.
  if (error && error.code !== "PGRST116") {
    await sleep(300);
    ({ data, error } = await query());
  }

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

    // Translate-aware substitution: runs parseInlineFormatting ONLY on the
    // substituted regions (sentinel-guarded) so publisher markup is preserved
    // and any markdown in variable values (e.g. `rejectionMessage1: "[here](https://x.com)"`)
    // gets rendered as a real <a> tag.
    const { html: personalizedHtml, subject: personalizedSubject } = substituteAndTranslate(
      template.html,
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

export interface ChunkedBatchOptions {
  recipients: BatchRecipient[];
  templateSlug: string;
  /**
   * Prefix for Resend idempotency keys, e.g. `final-approve:<cycleId>:rejected`.
   * Combined with a hash of each chunk's recipients so an identical chunk
   * re-sent within 24h is deduplicated by Resend.
   */
  idempotencyPrefix: string;
  fromName?: string;
  /** Pause between batch calls. Resend's default limit is a few requests/sec. */
  delayMs?: number;
  /**
   * Called after each chunk with that chunk's per-recipient results. Awaited,
   * so callers can persist logs before the next chunk goes out — if the
   * function is killed mid-run, everything already sent is already recorded.
   */
  onChunk?: (results: (ChunkResult & { recipient: BatchRecipient })[]) => Promise<void>;
}

/**
 * Send templated emails through Resend's batch endpoint, up to 100 per call.
 *
 * Replaces the one-request-per-recipient loop in sendBatchEmails for large
 * sends: ~1,200 recipients take ~13 calls (seconds) instead of ~4 minutes,
 * which is what pushed final-approve past the function time limit on the
 * Oct 2026 Self Care cycle.
 */
export async function sendChunkedBatchEmails(
  options: ChunkedBatchOptions,
): Promise<BatchEmailResult> {
  const { recipients, templateSlug, idempotencyPrefix, fromName, delayMs = 600, onChunk } = options;

  const result: BatchEmailResult = { sent: 0, failed: 0, total: recipients.length, results: [] };
  if (recipients.length === 0) return result;

  const record = async (chunkRecipients: BatchRecipient[], chunkResults: ChunkResult[]) => {
    for (const r of chunkResults) {
      if (r.success) result.sent++;
      else result.failed++;
      result.results.push(r);
    }
    if (onChunk) {
      await onChunk(chunkResults.map((r, i) => ({ ...r, recipient: chunkRecipients[i] })));
    }
  };

  const template = await fetchTemplate(templateSlug);
  if (!template) {
    // Nothing was sent; report every recipient as failed so they are logged
    // and can be retried once the template is fixed.
    for (const c of chunk(recipients, RESEND_BATCH_MAX)) {
      await record(c, failChunk(c.map((r) => r.email), `Template "${templateSlug}" not found`));
    }
    return result;
  }

  const resend = getResend();
  const fromAddress = fromName ? `${fromName} <hello@nationalfundforwomen.org>` : FROM;
  const chunks = chunk(recipients, RESEND_BATCH_MAX);

  console.log(
    `[email-batch] Chunked send: ${recipients.length} emails in ${chunks.length} batch call(s)`,
  );

  for (let c = 0; c < chunks.length; c++) {
    const chunkRecipients = chunks[c];
    const emails = chunkRecipients.map((r) => r.email);
    const payload = chunkRecipients.map((r) => {
      const { html, subject } = substituteAndTranslate(template.html, template.subject, {
        name: r.name || "there",
        ...r.variables,
      });
      return { from: fromAddress, to: r.email, subject, html };
    });
    const idempotencyKey = chunkIdempotencyKey(
      idempotencyPrefix,
      chunkRecipients.map((r) => r.grantId ?? r.email),
    );

    let chunkResults: ChunkResult[] | null = null;
    // Retrying with the same idempotency key is safe: Resend replays the
    // original response instead of sending again.
    for (let attempt = 1; attempt <= 3 && !chunkResults; attempt++) {
      try {
        const res = await resend.batch.send(payload, {
          batchValidation: "permissive",
          idempotencyKey,
        });
        if (res.error) {
          const retryable = [
            "rate_limit_exceeded",
            "concurrent_idempotent_requests",
            "application_error",
            "internal_server_error",
          ].includes(res.error.name);
          if (retryable && attempt < 3) {
            await sleep(1000 * attempt);
            continue;
          }
          chunkResults = failChunk(emails, res.error.message);
        } else {
          chunkResults = mapBatchResponse(emails, res.data?.data, res.data?.errors);
        }
      } catch (err: unknown) {
        if (attempt < 3) {
          await sleep(1000 * attempt);
          continue;
        }
        chunkResults = failChunk(emails, err instanceof Error ? err.message : "Unknown error");
      }
    }

    await record(chunkRecipients, chunkResults!);

    if (c < chunks.length - 1) await sleep(delayMs);
  }

  console.log(
    `[email-batch] Chunked send complete: ${result.sent}/${result.total} sent, ${result.failed} failed`,
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

  // Translate-aware substitution (see sendBatchEmails above).
  const { html: personalizedHtml, subject: personalizedSubject } = substituteAndTranslate(
    template.html,
    template.subject,
    variables
  );

  return sendBrandedEmailBatch({
    to,
    name,
    subject: personalizedSubject,
    html: personalizedHtml,
  });
}

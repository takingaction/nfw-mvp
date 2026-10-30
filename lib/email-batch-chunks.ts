import { createHash } from "node:crypto";

/**
 * Pure helpers for chunked batch sends (lib/email-batch.ts →
 * sendChunkedBatchEmails). Kept free of Supabase/Resend imports so they can be
 * unit-tested directly (lib/email-batch-chunks.test.ts).
 */

/** Resend's batch endpoint accepts at most 100 emails per call. */
export const RESEND_BATCH_MAX = 100;

export interface ChunkResult {
  email: string;
  success: boolean;
  resendId?: string;
  error?: string;
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Deterministic idempotency key for one chunk. The same prefix + the same
 * recipients (in the same order) always yields the same key, so a retry or a
 * re-run within Resend's 24h idempotency window that rebuilds an identical
 * chunk is deduplicated by Resend instead of emailing those people twice.
 * Resend caps keys at 256 chars; a sha256 digest keeps us well under.
 */
export function chunkIdempotencyKey(prefix: string, recipientKeys: string[]): string {
  const digest = createHash("sha256").update(recipientKeys.join("\n")).digest("hex");
  return `${prefix}:${digest}`.slice(0, 256);
}

/**
 * Map a permissive-mode batch response back onto the chunk's recipients.
 * Resend returns `data` (ids for the emails it accepted, in request order) and
 * `errors` (`{ index, message }` for the ones it rejected).
 */
export function mapBatchResponse(
  emails: string[],
  data: { id: string }[] | null | undefined,
  errors: { index: number; message: string }[] | null | undefined,
): ChunkResult[] {
  const errByIndex = new Map((errors ?? []).map((e) => [e.index, e.message]));
  const ids = data ?? [];
  // If the counts line up, ids belong to the accepted indices in order.
  const idsAligned = ids.length === emails.length - errByIndex.size;
  let idCursor = 0;
  return emails.map((email, i) => {
    const err = errByIndex.get(i);
    if (err !== undefined) return { email, success: false, error: err };
    const resendId = idsAligned ? ids[idCursor++]?.id : undefined;
    return { email, success: true, resendId };
  });
}

/** Whole-chunk failure (request error, rate limit after retries, etc.). */
export function failChunk(emails: string[], message: string): ChunkResult[] {
  return emails.map((email) => ({ email, success: false, error: message }));
}

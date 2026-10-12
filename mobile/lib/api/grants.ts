import { api, ApiError, apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { GrantCycle } from "@/types/grants";

/**
 * Typed wrappers for the grant application + Stripe Connect routes.
 * Contracts: app/api/grants/{create,upload-document,document-url}/route.ts,
 * app/api/stripe/connect/{route,status/route}.ts, app/api/log/client-error/route.ts.
 */

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export interface CreateGrantBody {
  cycle_id: string;
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  certification_consent: boolean;
}

/** Cycles the member may apply to, incl. Late Submission Pass cycles. */
export function getApplicableGrantCycles() {
  return apiGet<{ cycles: GrantCycle[] }>("/api/grants/cycles/open");
}

export function createGrant(body: CreateGrantBody) {
  return apiPost<{ success: true; grantId: string }>("/api/grants/create", {
    ...body,
    // Server hard-codes these; sent for parity with the web form.
    is_nominating: false,
    nominee_name: null,
    nominee_email: null,
  });
}

/** Local file selected on device, before upload. */
export interface PendingDocument {
  /** Stable id for list keys / retry tracking */
  id: string;
  uri: string;
  name: string;
  /** One of ALLOWED_DOCUMENT_TYPES — mapped from extension when the picker reports octet-stream. */
  mimeType: string;
  size: number;
}

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Resolve a usable MIME type: trust the picker if allowed, else infer from the extension. */
export function resolveDocumentMime(reportedMime: string | null | undefined, fileName: string): string | null {
  if (reportedMime && (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(reportedMime)) return reportedMime;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? null;
}

/**
 * Server returns CYCLE_NOT_OPEN when the auto-close cron or admin closed the
 * cycle between page render and submit. The apply form uses this to surface
 * a "Back to all cycles" CTA instead of the generic 400 message.
 */
export const ERR_CYCLE_NOT_OPEN = "CYCLE_NOT_OPEN" as const;

/** Bucket name for member supporting documents (private). Must match lib/admin-documents.ts. */
export const GRANT_DOCS_BUCKET = "grant-documents";

interface PrepareUploadResponse {
  path: string;
  token: string;
}

interface PrepareUploadErrorBody {
  error?: string;
  code?: typeof ERR_CYCLE_NOT_OPEN | string;
  cycleStatus?: string;
  cycleEndDate?: string;
}

interface FinalizeUploadResponse {
  success: true;
  path: string;
}

/**
 * Step 1 of the 3-phase signed-URL upload. The server validates the file
 * metadata, checks the cycle is still open (or covered by a Late Submission
 * Pass), and mints a one-shot signed URL into the private grant-documents
 * bucket. The returned token is the upload credential — the actual file
 * bytes never go through Vercel, so 10 MB uploads succeed.
 *
 * Web: components/GrantApplicationForm.tsx prepareUpload() helper, lines 265-293.
 */
export async function prepareGrantDocumentUpload(
  grantId: string,
  doc: PendingDocument,
): Promise<PrepareUploadResponse> {
  try {
    const data = await apiPost<PrepareUploadResponse>("/api/grants/upload-document/prepare", {
      grantId,
      fileName: doc.name,
      mimeType: doc.mimeType,
      fileSize: doc.size,
    });
    return data;
  } catch (err) {
    // Re-throw with the typed body so the form can branch on CYCLE_NOT_OPEN.
    if (err instanceof ApiError) {
      const body = (err.body ?? {}) as PrepareUploadErrorBody;
      if (body.code === ERR_CYCLE_NOT_OPEN) {
        throw new GrantCycleClosedError(err.message, body.cycleStatus, body.cycleEndDate, err);
      }
    }
    throw err;
  }
}

/**
 * Step 2: the actual transfer. Reads the file from the device URI as a
 * Blob (React Native has no `File`; the URI is a file:// path the
 * `fetch` adapter knows how to read), then calls
 * `supabase.storage.uploadToSignedUrl()` directly. No Bearer token needed
 * — the signed URL is the credential.
 */
export async function transferDocumentToSignedUrl(
  bucket: string,
  path: string,
  token: string,
  doc: PendingDocument,
  signal?: AbortSignal,
): Promise<void> {
  const blobResponse = await fetch(doc.uri, { signal });
  if (!blobResponse.ok) {
    throw new Error(`Could not read ${doc.name} from device (HTTP ${blobResponse.status})`);
  }
  const blob = await blobResponse.blob();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, blob, { contentType: doc.mimeType });
  if (uploadError) {
    throw new Error(`Upload transfer failed: ${uploadError.message}`);
  }
}

/**
 * Step 3: tell the server the upload is on disk; it inserts the
 * `grant_documents` row tied to the grant.
 */
export async function finalizeGrantDocumentUpload(
  grantId: string,
  doc: PendingDocument,
  path: string,
): Promise<FinalizeUploadResponse> {
  return apiPost<FinalizeUploadResponse>("/api/grants/upload-document/finalize", {
    grantId,
    path,
    fileName: doc.name,
    mimeType: doc.mimeType,
    fileSize: doc.size,
  });
}

/** Distinguishable error for the apply form's cycle-closed UX. */
export class GrantCycleClosedError extends Error {
  readonly cycleStatus: string | undefined;
  readonly cycleEndDate: string | undefined;
  readonly original: unknown;

  constructor(
    message: string,
    cycleStatus: string | undefined,
    cycleEndDate: string | undefined,
    original: unknown,
  ) {
    super(message);
    this.name = "GrantCycleClosedError";
    this.cycleStatus = cycleStatus;
    this.cycleEndDate = cycleEndDate;
    this.original = original;
  }
}

/** Signed URL (1 h) for a stored document path. */
export function getDocumentUrl(grantId: string, filePath: string) {
  return apiPost<{ url: string }>("/api/grants/document-url", { grantId, filePath });
}

// ---------------------------------------------------------------------------
// Stripe Connect
// ---------------------------------------------------------------------------

export interface StripeConnectStatus {
  connected: boolean;
  status: "not_created" | "complete" | "incomplete";
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: unknown | null;
  email?: string | null;
}

/** Creates/reuses an Express account and returns an onboarding AccountLink URL. */
export function createStripeConnectLink(grantId: string) {
  return apiPost<{ url: string }>("/api/stripe/connect", { grantId });
}

export function getStripeConnectStatus(grantId: string) {
  return apiGet<StripeConnectStatus>("/api/stripe/connect/status", { query: { grantId } });
}

// ---------------------------------------------------------------------------
// Error reporting (Slack via web)
// ---------------------------------------------------------------------------

export function logGrantError(payload: {
  userId: string;
  userEmail?: string | null;
  cycleId: string;
  cycleName?: string;
  errorMessage: string;
  errorCode?: string;
  stack?: string;
}) {
  return apiPost("/api/log/client-error", {
    ...payload,
    platform: "mobile",
    timestamp: new Date().toISOString(),
  }).catch((err) => console.warn("[grants] error log failed", err));
}

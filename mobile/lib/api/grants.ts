import { api, apiGet, apiPost } from "@/lib/api";

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
 * Upload one supporting document. Multipart with fields `file` + `grantId`
 * (must be called AFTER createGrant — the route verifies grant ownership).
 * The MIME type on the FormData part is what the server validates.
 */
export function uploadGrantDocument(grantId: string, doc: PendingDocument) {
  const form = new FormData();
  // React Native FormData accepts { uri, name, type } for file parts.
  form.append("file", { uri: doc.uri, name: doc.name, type: doc.mimeType } as unknown as Blob);
  form.append("grantId", grantId);
  return api<{ success: true; path: string }>("/api/grants/upload-document", { method: "POST", rawBody: form });
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

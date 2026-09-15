/**
 * Flodesk API client (private integration, API-key auth).
 * Docs: https://developers.flodesk.com/
 *
 * - Plain fetch, no SDK (matches lib/push.ts / lib/slack-notifications.ts).
 * - Lazy env read: FLODESK_API_KEY. If missing, every call returns
 *   { ok: false, error: "not_configured" } and logs a warning once.
 * - Never throws. Callers get a discriminated result and decide what to do.
 * - Rate limits: 100 req/min on all endpoints, 20 req/min on /subscribers/batch
 *   (50 subscribers per batch call). A 429 is surfaced as `rateLimited: true`
 *   so the caller can stop and let the next scheduled run continue.
 */

const BASE_URL = "https://api.flodesk.com/v1";
const USER_AGENT = "National Fund for Women (https://www.nationalfundforwomen.org)";
const TIMEOUT_MS = 15_000;

export const FLODESK_BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlodeskSegment {
  id: string;
  name: string;
  total_active_subscribers?: number;
  color?: string;
  segment_type?: string;
}

export interface FlodeskSubscriber {
  id: string;
  status: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  segments?: { id: string; name: string }[];
  created_at?: string;
}

export interface FlodeskUpsertItem {
  email: string;
  first_name?: string;
  last_name?: string;
  segment_ids?: string[];
  double_optin?: boolean;
  custom_fields?: Record<string, string>;
}

export interface FlodeskBatchFailure {
  index?: number;
  email?: string;
  id?: string;
  code?: string;
  message?: string;
}

export type FlodeskResult<T> =
  | { ok: true; data: T; rateLimitRemaining?: number }
  | { ok: false; error: string; status?: number; rateLimited?: boolean };

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

let warnedMissingKey = false;

export function isFlodeskConfigured(): boolean {
  return Boolean(process.env.FLODESK_API_KEY);
}

function authHeader(): string | null {
  const key = process.env.FLODESK_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      console.warn("[flodesk] FLODESK_API_KEY not configured, Flodesk sync disabled");
      warnedMissingKey = true;
    }
    return null;
  }
  // Basic auth: API key as username, empty password
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<FlodeskResult<T>> {
  const auth = authHeader();
  if (!auth) return { ok: false, error: "not_configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: auth,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const remainingHeader = res.headers.get("X-Fd-RateLimit-Remaining");
    const rateLimitRemaining = remainingHeader ? Number(remainingHeader) : undefined;

    if (res.status === 429) {
      return { ok: false, error: "rate_limited", status: 429, rateLimited: true };
    }

    // 204 No Content (workflow endpoints)
    if (res.status === 204) {
      return { ok: true, data: undefined as T, rateLimitRemaining };
    }

    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (!res.ok) {
      const apiMessage =
        json && typeof json === "object" && "message" in json
          ? String((json as { message: unknown }).message)
          : "";
      const message: string = apiMessage || text.slice(0, 300) || `HTTP ${res.status}`;
      return { ok: false, error: message, status: res.status };
    }

    return { ok: true, data: json as T, rateLimitRemaining };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `timeout after ${TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split a full name into first/last for Flodesk. The signup flow stores a
 * "Member" placeholder for profiles created before step 1 — don't send that.
 */
export function splitName(fullName: string | null | undefined): { first_name?: string; last_name?: string } {
  const trimmed = (fullName || "").trim();
  if (!trimmed || trimmed.toLowerCase() === "member") return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Cheap connectivity/credential check. */
export async function testConnection(): Promise<FlodeskResult<{ segmentCount: number }>> {
  const res = await request<{ meta?: { total_items?: number }; data?: FlodeskSegment[] }>(
    "GET",
    "/segments?per_page=1",
  );
  if (!res.ok) return res;
  return {
    ok: true,
    data: { segmentCount: res.data.meta?.total_items ?? res.data.data?.length ?? 0 },
    rateLimitRemaining: res.rateLimitRemaining,
  };
}

/** List every segment in the account (follows pagination). */
export async function listSegments(): Promise<FlodeskResult<FlodeskSegment[]>> {
  const all: FlodeskSegment[] = [];
  let page = 1;
  // Hard cap to avoid runaway loops on a malformed meta block
  for (let i = 0; i < 20; i++) {
    const res = await request<{ meta?: { page?: number; total_pages?: number }; data?: FlodeskSegment[] }>(
      "GET",
      `/segments?page=${page}&per_page=100`,
    );
    if (!res.ok) return res;
    all.push(...(res.data.data || []));
    const totalPages = res.data.meta?.total_pages ?? 1;
    if (page >= totalPages) break;
    page++;
  }
  return { ok: true, data: all };
}

/** Retrieve a subscriber by id or email. 404 → ok:false with status 404. */
export async function getSubscriber(idOrEmail: string): Promise<FlodeskResult<FlodeskSubscriber>> {
  return request<FlodeskSubscriber>("GET", `/subscribers/${encodeURIComponent(idOrEmail)}`);
}

/**
 * Create or update up to 50 subscribers in one call (20 req/min).
 * Each item may include segment_ids; existing subscribers are merged, not replaced.
 */
export async function batchUpsertSubscribers(
  items: FlodeskUpsertItem[],
): Promise<FlodeskResult<{ successes: FlodeskSubscriber[]; failures: FlodeskBatchFailure[] }>> {
  if (items.length === 0) return { ok: true, data: { successes: [], failures: [] } };
  if (items.length > FLODESK_BATCH_SIZE) {
    return { ok: false, error: `batch exceeds ${FLODESK_BATCH_SIZE} items` };
  }
  const res = await request<{ successes?: FlodeskSubscriber[]; failures?: FlodeskBatchFailure[] }>(
    "POST",
    "/subscribers/batch",
    { subscribers: items },
  );
  if (!res.ok) return res;
  return {
    ok: true,
    data: { successes: res.data.successes || [], failures: res.data.failures || [] },
    rateLimitRemaining: res.rateLimitRemaining,
  };
}

/** Add a single subscriber to one or more segments. */
export async function addToSegments(
  idOrEmail: string,
  segmentIds: string[],
): Promise<FlodeskResult<FlodeskSubscriber>> {
  return request<FlodeskSubscriber>(
    "POST",
    `/subscribers/${encodeURIComponent(idOrEmail)}/segments`,
    { segment_ids: segmentIds },
  );
}

/** Remove a subscriber from one or more segments. */
export async function removeFromSegments(
  idOrEmail: string,
  segmentIds: string[],
): Promise<FlodeskResult<FlodeskSubscriber>> {
  return request<FlodeskSubscriber>(
    "DELETE",
    `/subscribers/${encodeURIComponent(idOrEmail)}/segments`,
    { segment_ids: segmentIds },
  );
}

/** Unsubscribe from all lists (used on account anonymization — Flodesk has no delete). */
export async function unsubscribeSubscriber(idOrEmail: string): Promise<FlodeskResult<FlodeskSubscriber>> {
  return request<FlodeskSubscriber>("POST", `/subscribers/${encodeURIComponent(idOrEmail)}/unsubscribe`);
}

import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

/**
 * Thin fetch wrapper for the existing Next.js API routes on Vercel
 * (https://nationalfundforwomen.org/api/*).
 *
 * Auth: the web app authenticates API routes via Supabase cookies. Mobile has
 * no cookies, so we attach `Authorization: Bearer <access_token>`.
 *
 * ⚠️ WEB-SIDE DEPENDENCY: lib/supabase/server.ts in the Next.js repo must be
 * updated to honour the Bearer header (see mobile/migration-blueprint.md →
 * "Dependencies on the Web Repo" #1). Until then, authenticated calls 401.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type Json = Record<string, unknown> | unknown[];

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  /** JSON-serialisable body. Use `rawBody` for FormData / strings. */
  body?: Json;
  rawBody?: BodyInit;
  headers?: Record<string, string>;
  /** Query params appended to the URL. Undefined / null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip attaching the Bearer token (public endpoints). Default false. */
  anonymous?: boolean;
};

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, env.apiBaseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Perform a request against `/api/*`. Resolves with parsed JSON (or `null`
 * for 204). Rejects with `ApiError` on non-2xx.
 *
 * @example
 *   const profile = await api<ProfileResponse>("/api/auth/profile");
 *   await api("/api/perks/liked-stores", { method: "POST", body: { store_key, store_name } });
 */
export async function api<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, rawBody, headers = {}, query, anonymous = false, ...init } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (!anonymous) {
    const token = await getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let finalBody: BodyInit | undefined = rawBody;
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    method: init.method ?? (finalBody ? "POST" : "GET"),
    headers: finalHeaders,
    body: finalBody,
  });

  if (response.status === 204) return null as T;

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string"
        ? parsed.error
        : null) ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, parsed);
  }

  return parsed as T;
}

/** Convenience helpers */
export const apiGet = <T = unknown>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
  api<T>(path, { ...options, method: "GET" });

export const apiPost = <T = unknown>(path: string, body?: Json, options?: Omit<ApiRequestOptions, "method" | "body">) =>
  api<T>(path, { ...options, method: "POST", body });

export const apiDelete = <T = unknown>(path: string, options?: Omit<ApiRequestOptions, "method">) =>
  api<T>(path, { ...options, method: "DELETE" });

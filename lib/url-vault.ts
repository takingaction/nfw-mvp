/**
 * URL vault: keeps sensitive values out of page addresses.
 *
 * Anything in a page's URL is visible to every analytics or ad tag on that
 * page (GA4 records the full address, even in consent-denied pings). Links we
 * send out still carry values such as waitlist tokens and gift codes, so the
 * proxy holds those values in a short-lived, HttpOnly cookie and redirects to
 * the same path without them, before any HTML (and so any tag) loads. On the
 * clean request it rewrites the values back in server-side, so server pages
 * still receive them as searchParams while the browser address stays clean.
 *
 * Edge-runtime safe: no Node APIs.
 */

export const VAULT_COOKIE = "nfw_url_vault";
const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 8;

/** Params held back from the address, by exact page path. */
const RULES: Record<string, string[]> = {
  "/auth/accept-waitlist": ["token", "error"],
  "/redeem": ["code"],
  "/auth/sign-up": ["gift"],
  "/auth/sign-up-success": ["email"],
  "/auth/error": ["error", "email"],
  "/grants/application-success": ["id"],
  "/grants/connect/refresh": ["grantId"],
  "/grants/connect/return": ["grantId"],
  "/gift-membership/success": ["session_id"],
  "/dashboard": ["session_id"],
};

/** A `next` param is held back too when its target carries one of these. */
const SENSITIVE_IN_NEXT = /[?&](token|code|gift|email|session_id|grantId|id)=/i;

/** Route handlers and non-page paths: never touched (no tags run on them). */
const EXCLUDED_PREFIXES = ["/api/", "/_next/", "/auth/callback", "/auth/confirm", "/travel/embed"];

type Held = Record<string, string>;
type Vault = Record<string, { p: Held; t: number }>;

export const vaultCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_MS / 1000,
};

export function isVaultEligiblePath(pathname: string): boolean {
  return !EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/** Split a URL into the values to hold back and the clean URL, or null if nothing to hold. */
export function splitSensitive(url: URL): { held: Held; cleanUrl: URL } | null {
  const names = new Set(RULES[url.pathname] ?? []);
  const next = url.searchParams.get("next");
  if (next && SENSITIVE_IN_NEXT.test(next)) names.add("next");

  const held: Held = {};
  for (const name of names) {
    const value = url.searchParams.get(name);
    if (value !== null && value !== "") held[name] = value;
  }
  if (Object.keys(held).length === 0) return null;

  const cleanUrl = new URL(url.toString());
  for (const name of Object.keys(held)) cleanUrl.searchParams.delete(name);
  cleanUrl.searchParams.delete("_rsc");
  return { held, cleanUrl };
}

export function readVault(raw: string | undefined, now = Date.now()): Vault {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Vault;
    const out: Vault = {};
    for (const [path, entry] of Object.entries(parsed)) {
      if (entry && typeof entry.t === "number" && now - entry.t < TTL_MS && entry.p && typeof entry.p === "object") {
        out[path] = entry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeVault(vault: Vault, path: string, held: Held, now = Date.now()): string {
  const next: Vault = { ...vault, [path]: { p: held, t: now } };
  const newestFirst = Object.entries(next).sort((a, b) => b[1].t - a[1].t).slice(0, MAX_ENTRIES);
  return JSON.stringify(Object.fromEntries(newestFirst));
}

/** Held values for this path that the request URL does not already carry. */
export function heldFor(vault: Vault, url: URL): Held | null {
  const entry = vault[url.pathname];
  if (!entry) return null;
  const missing: Held = {};
  for (const [name, value] of Object.entries(entry.p)) {
    if (!url.searchParams.has(name)) missing[name] = String(value);
  }
  return Object.keys(missing).length ? missing : null;
}

export function withParams(url: URL, held: Held): URL {
  const target = new URL(url.toString());
  for (const [name, value] of Object.entries(held)) target.searchParams.set(name, value);
  return target;
}

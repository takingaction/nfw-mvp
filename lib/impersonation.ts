import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Admin "View as Member" cookie-based session.
 *
 * Wire model:
 *   - A signed HTTP-only cookie `nfw_view_as` carries `<sessionId>.<hmac>`.
 *   - Server looks up the impersonation row in Supabase and verifies the
 *     acting admin + the still-valid target session.
 *   - When valid, the returned context is used by server components to
 *     filter data queries to the target user_id.
 *   - When admin clicks "Stop Impersonating", a separate endpoint clears
 *     the cookie.
 *   - Writes are blocked at the API layer by lib/view-as-blocklist.
 *
 * Note: This cookie stores an opaque session-id pointer, not a token.
 * We do NOT mint a target Supabase session. The data fetching uses the
 * service-role key (admin anyway) and RLS evaluates correctly.
 */

export const VIEW_AS_COOKIE_NAME = "nfw_view_as";

export interface ImpersonationContext {
  sessionId: string;
  adminUserId: string;
  targetUserId: string;
  targetEmail: string;
  targetFullName: string | null;
}

/** Admins whose accounts may also be impersonated. */
export const IMPERSONATABLE_ADMIN_EMAILS = [
  "kelsey@nationalfundforwomen.org",
  "ron@myherodesign.com",
] as const;

function getSecret(): string | null {
  // Fail closed: if the secret is missing or weak, we cannot verify cookies.
  // Pages that depend on getImpersonationContext() fall back to admin's own
  // session. This is the safe default.
  const s = process.env.VIEW_AS_COOKIE_SECRET;
  if (!s || s.length < 32) return null;
  return s;
}

function sign(sessionId: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("VIEW_AS_COOKIE_SECRET not set");
  return createHmac("sha256", secret).update(sessionId).digest("hex");
}

export function buildViewAsCookieValue(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

export function setImpersonationCookieHeader(sessionId: string): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: VIEW_AS_COOKIE_NAME,
    value: buildViewAsCookieValue(sessionId),
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      // 8h idle. DB row is the authoritative end via /api/admin/impersonation/stop.
      maxAge: 60 * 60 * 8,
    },
  };
}

export function clearImpersonationCookieHeader(): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: VIEW_AS_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    },
  };
}

/** Read the raw cookie payload (or null). Does not verify. */
export async function readImpersonationCookieRaw(): Promise<{
  sessionId: string;
  signature: string;
} | null> {
  try {
    const store = await cookies();
    const c = store.get(VIEW_AS_COOKIE_NAME);
    if (!c?.value) return null;
    const [sessionId, signature] = c.value.split(".");
    if (!sessionId || !signature) return null;
    return { sessionId, signature };
  } catch {
    return null;
  }
}

function verify(sessionId: string, sig: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  try {
    const expected = Buffer.from(
      createHmac("sha256", secret).update(sessionId).digest("hex"),
      "utf8",
    );
    const got = Buffer.from(sig, "utf8");
    if (expected.length !== got.length) return false;
    return timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

/**
 * Synchronous check: does this request carry a validly-signed `nfw_view_as`
 * cookie? Used by the API write blocklist (lib/view-as.ts#blockIfViewingAs),
 * which must run without a DB round-trip.
 *
 * A valid signature is sufficient to block writes: the cookie can only be
 * minted by /api/admin/members/[id]/view-as and is cleared by
 * /api/admin/view-as/stop. We intentionally do NOT check `admin_view_logs`
 * here — blocking too eagerly (stale-but-signed cookie) is the safe failure.
 */
export function hasValidViewAsCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== VIEW_AS_COOKIE_NAME) continue;
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return false;
    }
    const [sessionId, signature] = value.split(".");
    if (!sessionId || !signature) return false;
    return verify(sessionId, signature);
  }
  return false;
}

/**
 * Resolve the current impersonation context if the request's signed cookie
 * points at an open `admin_view_logs` row.
 *
 * Returns `null` if no cookie, cookie is malformed, HMAC fails, secret is
 * missing, session is closed, or the target row is gone. NEVER throws —
 * failures fall back to the admin's normal session.
 */
export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const raw = await readImpersonationCookieRaw();
  if (!raw) return null;
  if (!verify(raw.sessionId, raw.signature)) return null;

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("admin_view_logs")
    .select(
      "id, admin_user_id, target_user_id, ended_at, profiles:target_user_id(email, full_name)",
    )
    .eq("id", raw.sessionId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.ended_at) return null;
  if (!data.profiles) return null;

  const p = data.profiles as unknown as { email?: string; full_name?: string | null };
  if (!p.email) return null;

  return {
    sessionId: data.id,
    adminUserId: data.admin_user_id,
    targetUserId: data.target_user_id,
    targetEmail: p.email,
    targetFullName: p.full_name ?? null,
  };
}

function getServiceSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Returns true if a target user_id is allowed to be impersonated.
 * - Anyone whose `is_admin` is not true is allowed.
 * - Only the two head admins are allowed among admin rows.
 * - Cannot impersonate yourself.
 */
export function canImpersonateTarget(args: {
  adminUserId: string;
  targetUserId: string;
  targetEmail: string | null;
  targetIsAdmin: boolean;
}): boolean {
  if (args.adminUserId === args.targetUserId) return false;
  if (!args.targetIsAdmin) return true;
  return (
    !!args.targetEmail &&
    IMPERSONATABLE_ADMIN_EMAILS.includes(
      args.targetEmail.toLowerCase() as (typeof IMPERSONATABLE_ADMIN_EMAILS)[number],
    )
  );
}

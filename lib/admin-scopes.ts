/**
 * Scoped admin access for non-admins (migration 207, profiles.admin_scopes).
 *
 * is_admin is all-or-nothing. A scope grants one admin area plus the
 * restricted /admin hub, and nothing else. Edge-safe: no server imports, so
 * proxy.ts can use it.
 *
 * To add a scope: add an entry here (pages + the exact APIs those pages call),
 * switch those routes from requireAdmin() to requireAdminOrScope("<key>"),
 * and hide any write actions on the page for non-admins. No migration needed.
 */

interface AdminScopeDef {
  label: string;
  description: string;
  /** Admin pages this scope opens (prefix match on path segments). */
  pages: readonly string[];
  /** Admin API routes those pages need (prefix match on path segments). */
  apis: readonly string[];
}

export const ADMIN_SCOPES = {
  members: {
    label: "Members (view + CSV export)",
    description:
      "Can open Manage Members to view/search members and download the CSV. Cannot edit, delete, pause, change emails or view as a member.",
    pages: ["/admin/members"],
    apis: ["/api/admin/members/list", "/api/admin/members/export"],
  },
} as const satisfies Record<string, AdminScopeDef>;

export type AdminScope = keyof typeof ADMIN_SCOPES;

export const ADMIN_SCOPE_KEYS = Object.keys(ADMIN_SCOPES) as AdminScope[];

export function isAdminScope(value: unknown): value is AdminScope {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ADMIN_SCOPES, value);
}

/** Known scopes only, de-duplicated. Anything else (null, junk) -> []. */
export function normalizeAdminScopes(raw: unknown): AdminScope[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter(isAdminScope)));
}

function pathMatches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Whether a scoped (non-admin) user may reach this /admin or /api/admin path.
 * Any scope also opens the /admin hub itself (which then only lists their pages).
 */
export function scopedPathAllowed(scopes: readonly AdminScope[], pathname: string): boolean {
  if (scopes.length === 0) return false;
  if (pathname === "/admin" || pathname === "/admin/") return true;
  return scopes.some((scope) => {
    const def = ADMIN_SCOPES[scope];
    return [...def.pages, ...def.apis].some((base) => pathMatches(pathname, base));
  });
}

/** Admin pages a scoped user can open (for the restricted hub). */
export function scopedPages(scopes: readonly AdminScope[]): string[] {
  return Array.from(new Set(scopes.flatMap((s) => [...ADMIN_SCOPES[s].pages])));
}

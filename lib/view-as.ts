/**
 * Helpers for the admin "View as Member" feature.
 *
 * Pattern: an admin visits a member-facing URL with `?view_as=<uuid>`
 * appended. The page detects the param, verifies the caller is an admin,
 * and filters data queries to the target user_id.
 *
 * This is a URL-state approach, not a cookie/token approach. State lives in
 * the URL, which means internal links must preserve the param. The
 * `buildViewAsUrl` helper here is the single place to do that correctly.
 */

const VIEW_AS_PARAM = "view_as";

/** True if the param is present and non-empty. Treats whitespace-only as absent. */
export function hasViewAs(viewAsUserId: string | null | undefined): boolean {
  return !!(viewAsUserId && viewAsUserId.trim().length > 0);
}

/**
 * Server-side guard for member-write API routes.
 *
 * Returns a NextResponse 423 if the request has `?view_as=` in its URL,
 * otherwise returns null. Routes call this at the top of their handler:
 *
 * ```ts
 * const blocked = blockIfViewingAs(request);
 * if (blocked) return blocked;
 * ```
 *
 * The reason is: when the admin is viewing the site as another member via
 * `?view_as=<uuid>`, they must not be able to perform any writes that would
 * mutate data on the target's behalf. Reads are unaffected.
 */
export function blockIfViewingAs(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.searchParams.has(VIEW_AS_PARAM)) {
    return new Response(
      JSON.stringify({
        error:
          "Writes are blocked while viewing as another member. Please exit preview first.",
        code: "WRITE_BLOCKED_WHILE_VIEWING_AS",
      }),
      {
        status: 423,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return null;
}

/**
 * Build a URL with the view_as param preserved.
 *
 * - If viewAsUserId is null/empty, returns path unchanged.
 * - If path already has a query string, appends with `&`.
 * - If path already has view_as, replaces it.
 * - Encodes the value safely.
 */
export function buildViewAsUrl(
  path: string,
  viewAsUserId: string | null | undefined
): string {
  if (!hasViewAs(viewAsUserId)) return path;
  const id = viewAsUserId!.trim();

  // Split path on existing `?` to inspect and preserve other params.
  const queryStart = path.indexOf("?");
  if (queryStart === -1) {
    return `${path}?${VIEW_AS_PARAM}=${encodeURIComponent(id)}`;
  }
  const base = path.slice(0, queryStart);
  const existingQuery = path.slice(queryStart + 1);

  const params = new URLSearchParams(existingQuery);
  params.set(VIEW_AS_PARAM, id);
  return `${base}?${params.toString()}`;
}

/** Strip the view_as param from a URL. Returns path unchanged if param absent. */
export function stripViewAs(path: string): string {
  const queryStart = path.indexOf("?");
  if (queryStart === -1) return path;
  const base = path.slice(0, queryStart);
  const existingQuery = path.slice(queryStart + 1);
  const params = new URLSearchParams(existingQuery);
  if (!params.has(VIEW_AS_PARAM)) return path;
  params.delete(VIEW_AS_PARAM);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Read view_as from a Next.js searchParams object. Returns null if absent
 * or empty. searchParams may be a plain object or a Promise (Next 15+);
 * we accept both shapes.
 */
export function getViewAsFromSearchParams(
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
    | undefined
    | null
): string | null {
  if (!searchParams) return null;
  // We don't await the Promise here — caller is expected to await before
  // calling. This helper just does the safe extraction.
  const v = (searchParams as Record<string, string | string[] | undefined>)[
    VIEW_AS_PARAM
  ];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

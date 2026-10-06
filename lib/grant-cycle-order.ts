/**
 * Canonical grant-cycle display order — matches /admin/grants
 * (app/admin/grants/page.tsx): display_order asc (nulls last),
 * then created_at desc (newest first among ties).
 *
 * Ties are common: new cycles get display_order = 0 (create route
 * doesn't set it) and drag-reorder assigns 0..n-1.
 *
 * Used by every member-facing cycle list (web apply page, the cycles
 * API used by web pre-check and mobile Grants tab + apply screen, and
 * the dashboard "Available Microgrants" strip). Any new member-facing
 * list that shows grant cycles must use this helper, not a custom
 * order.
 *
 * Comparing `created_at` as text is safe because Postgres returns it
 * in ISO format, which sorts correctly as a string.
 */
type Orderable = { display_order?: number | null; created_at?: string | null };

export function compareCycleDisplayOrder(a: Orderable, b: Orderable): number {
  const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
}
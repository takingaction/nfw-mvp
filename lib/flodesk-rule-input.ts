import { RULE_CATEGORIES, type RuleCategory } from "@/lib/flodesk-rules";

/**
 * Validate/normalize a flodesk_sync_rules payload from the admin UI.
 * `requireAll` = create (key/name/category/delay required); otherwise partial update.
 */
export function validateRuleInput(
  body: unknown,
  opts: { requireAll: boolean },
): { ok: true; values: Record<string, unknown> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const b = body as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if (b.key !== undefined || opts.requireAll) {
    const key = typeof b.key === "string" ? b.key.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_") : "";
    if (!key) return { ok: false, error: "key is required" };
    values.key = key;
  }
  if (b.name !== undefined || opts.requireAll) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) return { ok: false, error: "name is required" };
    values.name = name;
  }
  if (b.description !== undefined) {
    values.description = typeof b.description === "string" && b.description.trim() ? b.description.trim() : null;
  }
  if (b.category !== undefined || opts.requireAll) {
    if (!RULE_CATEGORIES.includes(b.category as RuleCategory)) {
      return { ok: false, error: `category must be one of: ${RULE_CATEGORIES.join(", ")}` };
    }
    values.category = b.category;
  }
  if (b.delay_days !== undefined || opts.requireAll) {
    const d = Number(b.delay_days ?? 0);
    if (!Number.isInteger(d) || d < 0 || d > 3650) return { ok: false, error: "delay_days must be an integer 0–3650" };
    values.delay_days = d;
  }
  if (b.flodesk_segment_id !== undefined) {
    values.flodesk_segment_id =
      typeof b.flodesk_segment_id === "string" && b.flodesk_segment_id.trim() ? b.flodesk_segment_id.trim() : null;
  }
  if (b.flodesk_segment_name !== undefined) {
    values.flodesk_segment_name =
      typeof b.flodesk_segment_name === "string" && b.flodesk_segment_name.trim() ? b.flodesk_segment_name.trim() : null;
  }
  if (b.remove_on_exit !== undefined) values.remove_on_exit = Boolean(b.remove_on_exit);
  if (b.is_enabled !== undefined) values.is_enabled = Boolean(b.is_enabled);

  // Mirror the DB CHECK so the admin gets a readable error on create
  if (values.is_enabled === true && values.flodesk_segment_id === null) {
    return { ok: false, error: "Assign a Flodesk segment before enabling this rule" };
  }

  values.updated_at = new Date().toISOString();
  return { ok: true, values };
}

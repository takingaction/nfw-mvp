/**
 * Formatting helpers. The whole platform runs on Pacific Time (mirrors
 * SITE_TZ in the web app's lib/dates.ts).
 *
 * Date-only values ("YYYY-MM-DD", or date markers stored as midnight UTC
 * such as grant_cycles.end_date) render exactly as written. Real timestamps
 * render as their Pacific-time calendar date.
 */

export const SITE_TZ = "America/Los_Angeles";

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | string | null | undefined, cents = false): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return cents ? "$0.00" : "$0";
  return (cents ? usd2 : usd0).format(n);
}

/** Midnight-UTC timestamps are date-only markers (e.g. grant_cycles.end_date). */
const DATE_MARKER = /T00:00:00(\.0+)?(Z|[+-]00(:?00)?)$/;

/**
 * Parse a date-ish value into a Date at UTC midnight of the calendar day to
 * display (then formatted with timeZone "UTC"):
 *   - "YYYY-MM-DD" or a midnight-UTC marker → that date as written
 *   - any other timestamp / Date → its Pacific-time calendar date
 */
function toUtcDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  let datePart: string;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    datePart = siteToday(input);
  } else if (!input.includes("T") || DATE_MARKER.test(input)) {
    datePart = input.split("T")[0];
  } else {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    datePart = siteToday(d);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** "September 11, 2026" */
export function formatDateLong(input: string | Date | null | undefined): string {
  const d = toUtcDate(input);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Sep 11, 2026" */
export function formatDateShort(input: string | Date | null | undefined): string {
  const d = toUtcDate(input);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Sep 2026" — used for "Member since". */
export function formatMonthYear(input: string | Date | null | undefined): string {
  const d = toUtcDate(input);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** "Sep 11, 2026, 3:42 PM" — for timestamps (Pacific time). */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    timeZone: SITE_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today's date as "YYYY-MM-DD" in UTC — matches the web's end_date comparisons. */
export function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Today's calendar date in Pacific time as "YYYY-MM-DD" (DST-safe via Intl).
 * Use this (not `todayIsoDate`, which is UTC) when comparing against
 * date-only DB columns like `grant_cycles.end_date`: cycles accept
 * applications through 11:59 PM PT on end_date.
 *
 * Mirrors siteToday in the web app's lib/dates.ts.
 */
export function siteToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Decode the handful of HTML entities that show up in CMS-authored strings. */
export function decodeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/** "Sarah Jane Smith" → "SJ" */
export function initials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

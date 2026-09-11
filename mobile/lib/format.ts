/**
 * Formatting helpers. Dates are parsed as UTC calendar dates to avoid the
 * off-by-one-day bug the web app hit with `new Date("YYYY-MM-DD")`.
 */

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

/** Parse "YYYY-MM-DD" or an ISO timestamp into a Date at UTC midnight of that calendar day. */
function toUtcDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  const datePart = input.split("T")[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
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

/** "Sep 11, 2026, 3:42 PM" — for timestamps (local time). */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
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

/**
 * Site time zone utilities.
 *
 * The whole site runs on Pacific Time (America/Los_Angeles). All timestamps
 * in the DB are UTC (TIMESTAMPTZ); these helpers convert to and from PT
 * calendar days/months for display, filtering, grant deadlines and
 * monthly claims. Never rely on the server's or browser's local time zone
 * (Vercel functions run in UTC) — always go through these helpers.
 *
 * The DB mirrors this with public.site_tz() (migration 212).
 */

export const SITE_TZ = "America/Los_Angeles";
/** Short label shown next to times, e.g. "11:59 PM PT". */
export const SITE_TZ_LABEL = "PT";

/** UTC offset of SITE_TZ at a given instant, in minutes (e.g. -420 for PDT). */
function siteOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: SITE_TZ, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** UTC instant of 00:00 site time on the given calendar date (DST-safe). */
function siteMidnight(y: number, m: number, d: number): Date {
  const wallAsUtc = Date.UTC(y, m - 1, d);
  let t = wallAsUtc - siteOffsetMinutes(new Date(wallAsUtc + 12 * 3600_000)) * 60_000;
  // Midnight falls before the 2 AM DST switch, so re-check the offset at
  // the candidate instant itself.
  const off = siteOffsetMinutes(new Date(t));
  t = wallAsUtc - off * 60_000;
  return new Date(t);
}

function splitYmd(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return [y, m, d];
}

/** Today's calendar date in site time as "YYYY-MM-DD". */
export function siteToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** First day of the current site-time month as "YYYY-MM-01" (claim_month key). */
export function siteMonthKey(now: Date = new Date()): string {
  return `${siteToday(now).slice(0, 7)}-01`;
}

/** UTC instants bounding the site-time month containing `now`: [start, end). */
export function siteMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const [y, m] = splitYmd(siteToday(now));
  return {
    start: siteMidnight(y, m, 1),
    end: m === 12 ? siteMidnight(y + 1, 1, 1) : siteMidnight(y, m + 1, 1),
  };
}

/** Parse "YYYY-MM-DD" as 00:00 site time on that date. */
export function parseSiteDate(dateStr: string): Date {
  const [y, m, d] = splitYmd(dateStr);
  return siteMidnight(y, m, d);
}

/** Last millisecond (23:59:59.999 site time) of "YYYY-MM-DD". */
export function siteEndOfDay(dateStr: string): Date {
  const [y, m, d] = splitYmd(dateStr);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return new Date(
    siteMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()).getTime() - 1,
  );
}

/**
 * Start of the current month / quarter / year in site time.
 * Used for relative date ranges (month-to-date, quarter-to-date, year-to-date).
 */
export function startOfCurrentPeriod(period: "month" | "quarter" | "year", now: Date = new Date()): Date {
  const [y, m] = splitYmd(siteToday(now));
  if (period === "month") return siteMidnight(y, m, 1);
  if (period === "quarter") return siteMidnight(y, Math.floor((m - 1) / 3) * 3 + 1, 1);
  return siteMidnight(y, 1, 1);
}

/** Format Date as site-time "MM-DD-YYYY" key. */
export function formatSiteDateKey(date: Date): string {
  return date
    .toLocaleDateString("en-US", { timeZone: SITE_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\//g, "-");
}

/** Format Date as site-time display string (e.g., "Sep 15, 2026"). */
export function formatSiteDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: SITE_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format Date as site time for input fields (e.g., "09/15/2026"). */
export function formatSiteInput(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: SITE_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date-only value ("2026-10-22" or "2026-10-22T00:00:00+00") as
 * "Oct 22, 2026" exactly as written — no timezone shift.
 * `new Date("2026-10-22")` is UTC midnight, which renders as Oct 21 in
 * Pacific time; never use it for date-only columns.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = splitYmd(value);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format Date as site-time "MMM DD" chart label (e.g., "Sep 07").
 * Zero-pads day for correct alphabetical sort (07 < 10).
 */
export function formatSiteChartLabel(date: Date): string {
  const parts = date
    .toLocaleDateString("en-US", { timeZone: SITE_TZ, month: "short", day: "2-digit", year: "numeric" })
    .split(" ");
  return `${parts[0]} ${parts[1].replace(",", "")}`;
}

/** Chart label for a joined_at timestamp. */
export function parseJoinedAt(joinedAt: string): string {
  return formatSiteChartLabel(new Date(joinedAt));
}

/**
 * Site-time calendar date of a timestamp as "YYYY-MM-DD".
 * Sorts chronologically as a plain string — use as the grouping key for charts.
 */
export function siteDateKey(timestamp: string): string {
  return siteToday(new Date(timestamp));
}

/** Full site-time date with year (e.g., "Sep 07 2026") for chart tooltips. */
export function formatJoinedAtFull(joinedAt: string): string {
  const parts = new Date(joinedAt)
    .toLocaleDateString("en-US", { timeZone: SITE_TZ, month: "short", day: "2-digit", year: "numeric" })
    .split(" ");
  return `${parts[0]} ${parts[1].replace(",", "")} ${parts[2]}`;
}

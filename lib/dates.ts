/**
 * EST (America/New_York) timezone utilities
 * All dates stored in DB are UTC (TIMESTAMPTZ)
 * These helpers ensure consistent EST display and filtering
 */

// EST offset is UTC-5 (or UTC-4 during DST, but we use EST year-round for simplicity)
// EST = UTC-5 hours
const EST_OFFSET_HOURS = 5;

/**
 * Parse YYYY-MM-DD date string as EST midnight
 * Input: "2026-09-15" → Output: Date where UTC midnight = 00:00 EST
 * Since EST = UTC-5, to get 00:00 EST we need UTC 05:00
 */
export function parseESTDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Create EST midnight: UTC = EST + 5 hours
  // So 00:00 EST = 05:00 UTC
  return new Date(Date.UTC(y, m - 1, d, EST_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Format Date as EST YYYY-MM-DD string for chart labels
 */
export function formatESTDateKey(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, '-');
}

/**
 * Format Date as EST display string (e.g., "Sep 15, 2026")
 */
export function formatESTDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format Date as EST for input fields (e.g., "09/15/2026")
 */
export function formatESTInput(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Get end of EST day as UTC Date
 * End of Sept 15 EST = start of Sept 16 EST = 05:00 UTC on Sept 16
 */
export function endOfESTDay(startOfDay: Date): Date {
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Create a Date for start of current period in EST
 * Used for relative date ranges (month-to-date, quarter-to-date, year-to-date)
 */
export function startOfCurrentPeriod(period: 'month' | 'quarter' | 'year'): Date {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  let day = 1;

  if (period === 'month') {
    // Month to date: start of current month
    // EST midnight = UTC 05:00
    return new Date(Date.UTC(year, month, day, EST_OFFSET_HOURS, 0, 0, 0));
  }

  if (period === 'quarter') {
    // Quarter to date: start of current quarter
    month = Math.floor(month / 3) * 3;
    return new Date(Date.UTC(year, month, day, EST_OFFSET_HOURS, 0, 0, 0));
  }

  // Year to date: start of current year
  month = 0;
  day = 1;
  return new Date(Date.UTC(year, month, day, EST_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Parse joined_at timestamp and return EST date key for grouping
 */
export function parseJoinedAt(joinedAt: string): string {
  return formatESTDateKey(new Date(joinedAt));
}

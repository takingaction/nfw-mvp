/** Pure date-string helpers shared by DateField and profile screens. */

/** "1990-07-04" (or ISO timestamp) → "07/04/1990" */
export function isoToUs(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : "";
}

/** "07/04/1990" → "1990-07-04", or null if not a real calendar date ≥ 1900. */
export function usToIso(us: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(us);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const month = Number(mm),
    day = Number(dd),
    year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${yyyy}-${mm}-${dd}`;
}

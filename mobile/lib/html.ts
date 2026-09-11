/**
 * Minimal HTML helpers for CMS / partner-authored strings. The web app uses DOM
 * APIs (`textarea.innerHTML` / `div.textContent`) which don't exist in RN.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  reg: "®",
  trade: "™",
  copy: "©",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
};

/** Decode named, decimal and hex entities. Leaves tags alone. */
export function decodeEntities(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function safeFromCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

/**
 * Strip tags and decode entities → plain text. Block-level closers and <br>
 * become newlines so paragraphs survive. Equivalent of the web's
 * `div.innerHTML = html; div.textContent`, but paragraph-aware.
 */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  const withBreaks = input
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withBreaks)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ExtractedLink {
  href: string;
  label: string;
}

/** Pull `<a href="…">label</a>` pairs out of an HTML string (absolute http(s) only). */
export function extractLinks(input: string | null | undefined): ExtractedLink[] {
  if (!input) return [];
  const out: ExtractedLink[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    const href = decodeEntities(m[1]).trim();
    if (!/^https?:\/\//i.test(href)) continue;
    out.push({ href, label: htmlToText(m[2]) || href });
  }
  return out;
}

/** First href in an HTML fragment, or the string itself if it's already a bare URL. */
export function firstUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;
  return extractLinks(trimmed)[0]?.href ?? null;
}

/** Pull a US-style phone number out of free text. */
export function extractPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.exec(htmlToText(input));
  return m ? m[0].trim() : null;
}

/**
 * Mirrors `simplifyRedemptionMessage` in components/perks/OfferDetailPanel.tsx:
 * boilerplate "To redeem this offer, click here and enter promotion code X …"
 * → "Enter promotion code X at checkout."
 */
export function simplifyRedemptionMessage(message: string | null | undefined, promoCode: string | null | undefined): string | null {
  const text = htmlToText(message);
  if (!text) return null;
  if (promoCode && /click here/i.test(text) && /promotion code|promo code/i.test(text)) {
    return `Enter promotion code ${promoCode} at checkout.`;
  }
  return text;
}

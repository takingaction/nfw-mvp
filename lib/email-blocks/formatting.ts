// URL schemes allowed in [label](url) link markup. Anything else is rejected
// to block javascript:/data: injection from template authors.
const ALLOWED_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  // Empty string is benign (caller decides what to do with it)
  if (!trimmed) return false;

  // Protocol-relative or relative paths are common in email footers
  // (e.g. "/grants/my-applications"). Allow them.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("#")) return true;

  // Check absolute URL scheme
  try {
    // Use the URL constructor relative to a base so we can parse same-origin
    // relative paths as well. For absolute URLs, this resolves the scheme.
    const parsed = new URL(trimmed, "https://nationalfundforwomen.org");
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Bold: **text** → <strong>text</strong>
// Italic: *text* → <em>text</em>
// Links: [text](url) → <a href="..." target="_blank" rel="noopener noreferrer">text</a>
// URLs with unsafe schemes (javascript:, data:, etc.) are stripped down to the label text only,
// preventing script injection from template authors.
//
// Translation order is significant:
// 1. Links run first so labels containing **bold** still get bolded afterwards.
// 2. Bold runs before italic so ** doesn't leave stray * that italic would otherwise consume.
//
// Note: there is intentionally no escape-pass for literal `**` because the previous
// implementation broke bold entirely (the escape converted all `**` to a sentinel
// before the bold regex ran, leaving the bold regex with nothing to match). The
// senior-dev tradeoff: predictable > magical — if a user actually wants literal
// `**` in an email, they can type the HTML `<strong>` they want directly.
export function parseInlineFormatting(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. Links: [label](url). URL safety validated before emitting <a>.
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, label, url) => {
      if (isSafeUrl(url)) {
        return `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${label}</a>`;
      }
      // Unsafe URL: render label only. The label may still contain **bold** or
      // *italic* which the bold/italic passes below will translate.
      return label;
    }
  );

  // 2. Bold: **text** → <strong>text</strong>
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // 3. Italic: *text* → <em>text</em>
  // Negative lookbehind prevents matching the trailing * in escaped asterisks
  // (currently unused, but kept defensively).
  result = result.replace(/(?<!\\)\*([^*]+)\*/g, "<em>$1</em>");

  return result;
}

export function parseParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n\n+/)
    .map(p => p.replace(/(?<!\n)\n(?!\n)/g, "<br>"))
    .filter(p => p.trim().length > 0);
}

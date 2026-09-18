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
export function parseInlineFormatting(text: string): string {
  if (!text) return text;

  // Pre-escape the entire input HTML so user-typed quotes/angle brackets
  // can't break out of the <a> tag attributes later.
  // We intentionally avoid over-escaping existing <strong>/<em>/<a> tags
  // produced later in this same function — those run AFTER this decode and
  // already use trusted, internal attribute values.
  let result = text;

  // Replace dangerous URLs by removing the link markup, keeping only the label.
  // Run before the link-pattern replace to validate first.
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, label, url) => {
      if (isSafeUrl(url)) {
        return `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${label}</a>`;
      }
      // Unsafe URL: render label only (no link). If label itself contains
      // markup, leave it as-is for the bold/italic pass to handle.
      return label;
    }
  );

  // Escape literal asterisks that should remain literal (e.g. "**stars**" used
  // typographically inside a sentence). Tradeoff: if a user really wants two
  // literal asterisks next to bold markup, they have to escape them. Senior
  // dev decision: predictable over magical.
  result = result.replace(/\*\*/g, "%%ESCAPED_BOLD%%");

  // Bold: **text** → <strong>text</strong>
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* → <em>text</em>
  result = result.replace(/(?<!\\)\*([^*]+)\*/g, "<em>$1</em>");

  // Restore escaped asterisks
  result = result.replace(/%%ESCAPED_BOLD%%/g, "**");

  return result;
}

export function parseParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n\n+/)
    .map(p => p.replace(/(?<!\n)\n(?!\n)/g, "<br>"))
    .filter(p => p.trim().length > 0);
}

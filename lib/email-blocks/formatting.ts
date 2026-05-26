// Bold: **text** → <strong>text</strong>
// Italic: *text* → <em>text>
// Links: [text](url) → <a>
export function parseInlineFormatting(text: string): string {
  let result = text.replace(/\*\*/g, "%%ESCAPED_BOLD%%");
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic (single asterisk, not part of bold)
  result = result.replace(/(?<!\\)\*([^*]+)\*/g, "<em>$1</em>");
  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: inherit; text-decoration: underline;">$1</a>');
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
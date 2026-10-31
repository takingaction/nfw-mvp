/**
 * Grant cycle descriptions are stored as plain text. Admins format them with
 * simple conventions, which are rendered on the web and in the mobile app:
 *   - a blank line starts a new paragraph
 *   - a single line break is kept as a line break
 *   - a line starting with "- ", "* " or "•" becomes a bullet point
 *
 * Keep in sync with mobile/lib/grant-description.ts.
 */

export type GrantDescriptionBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

const BULLET_RE = /^(?:[-*](?:\s+|$)|•\s*)(.*)$/;

export function parseGrantDescription(text: string | null | undefined): GrantDescriptionBlock[] {
  if (!text) return [];
  const blocks: GrantDescriptionBlock[] = [];
  let current: GrantDescriptionBlock | null = null;

  const close = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      close();
      continue;
    }
    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      const item = bullet[1].trim();
      if (!item) continue;
      if (current?.type !== "list") {
        close();
        current = { type: "list", items: [] };
      }
      current.items.push(item);
    } else {
      if (current?.type !== "paragraph") {
        close();
        current = { type: "paragraph", lines: [] };
      }
      current.lines.push(line);
    }
  }
  close();
  return blocks;
}

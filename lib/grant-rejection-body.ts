import { parseInlineFormatting } from "./email-blocks/formatting";

export type RejectionBodyBlockType = "paragraph" | "bullet";

export interface RejectionBodyBlock {
  type: RejectionBodyBlockType;
  text: string;
}

/**
 * Render an array of body blocks to safe HTML. Empty blocks (after trim)
 * are dropped before substitution, so blocks whose text is just a variable
 * like {{rejectionMessage2}} resolve to empty when the cycle has no value
 * for that variable, and the whole block disappears — not just the
 * placeholder.
 *
 * This is the only place that "knows" the final resolved text, so the
 * empty-block filter happens here (not in the email block renderer).
 *
 * Used by:
 *   - final-approve route (live batch send)
 *   - send-rejection-preview route (admin test email)
 */
export function renderRejectionBody(
  blocks: RejectionBodyBlock[] | null | undefined,
  variables: Record<string, string> = {}
): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b && typeof b.text === "string" && b.text.trim().length > 0)
    .map((b) => {
      const substituted = substituteVariables(b.text, variables);
      const translated = parseInlineFormatting(substituted);
      if (b.type === "bullet") {
        return `<li style="padding: 0 0 8px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; font-size: 16px;">•</span>${translated}</li>`;
      }
      return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${translated}</p>`;
    })
    .join("");
}

function substituteVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(
      `\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`,
      "g"
    );
    result = result.replace(pattern, value);
  }
  return result;
}

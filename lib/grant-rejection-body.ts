import { parseInlineFormatting } from "./email-blocks/formatting";

export type RejectionBodyBlockType = "paragraph" | "bullet";

export interface RejectionBodyBlock {
  type: RejectionBodyBlockType;
  text: string;
}

// Inline styles for the rejection body, matching the surrounding email body
// (EmailTextBlock defaults). Keeping these explicit ensures the rejection body
// renders with the same font and color regardless of which email client is
// used — many clients strip <style> and rely on inline styles for rendering.
const REJECTION_BODY_STYLES = {
  fontFamily: "'DM Sans', Arial, sans-serif",
  fontSize: "16px",
  color: "#3E145F",
  lineHeight: "1.6",
};

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
        // Use native <ul> disc bullet (list-style: disc) rather than an
        // absolutely-positioned <span>•</span>. The span approach caused
        // duplicate bullets because the default <ul> styling renders its
        // own disc bullet AND the span added a second one. Using
        // list-style: disc explicitly ensures the bullet renders in email
        // clients that strip <style> and rely on inline styles.
        return `<li style="margin: 0 0 8px 0; padding-left: 20px; list-style: disc; font-family: ${REJECTION_BODY_STYLES.fontFamily}; font-size: ${REJECTION_BODY_STYLES.fontSize}; color: ${REJECTION_BODY_STYLES.color}; line-height: ${REJECTION_BODY_STYLES.lineHeight};">${translated}</li>`;
      }
      return `<p style="margin: 0 0 16px 0; font-family: ${REJECTION_BODY_STYLES.fontFamily}; font-size: ${REJECTION_BODY_STYLES.fontSize}; color: ${REJECTION_BODY_STYLES.color}; line-height: ${REJECTION_BODY_STYLES.lineHeight};">${translated}</p>`;
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

/** Termly consent banner for nationalfundforwomen.org. */
export const TERMLY_WEBSITE_UUID = "182a3bc4-4347-44b6-b918-ef8406dd41e1";

/**
 * Termly's resource blocker with Auto Blocker on. It must be the first
 * third-party script on the page: Auto Blocker can only hold back scripts that
 * load after it, until the visitor consents to their category.
 */
export const TERMLY_SCRIPT_SRC = `https://app.termly.io/resource-blocker/${TERMLY_WEBSITE_UUID}?autoBlock=on`;

/**
 * The policy ID in a Termly "embed" snippet
 * (`<div name="termly-embed" data-id="…">`), or null when the saved code is a
 * static HTML copy of the policy instead.
 */
export function termlyPolicyId(embedCode: string): string | null {
  const tag = embedCode.match(/<div\b[^>]*\bname=["']termly-embed["'][^>]*>/i)?.[0];
  return tag?.match(/\bdata-id=["']([0-9a-f-]+)["']/i)?.[1] ?? null;
}

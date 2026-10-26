/** Termly consent banner for nationalfundforwomen.org. */
export const TERMLY_WEBSITE_UUID = "182a3bc4-4347-44b6-b918-ef8406dd41e1";

/**
 * Termly's resource blocker with Auto Blocker on. It must be the first
 * third-party script on the page: Auto Blocker can only hold back scripts that
 * load after it, until the visitor consents to their category.
 */
export const TERMLY_SCRIPT_SRC = `https://app.termly.io/resource-blocker/${TERMLY_WEBSITE_UUID}?autoBlock=on`;

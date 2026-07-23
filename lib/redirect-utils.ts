/**
 * Validates that a redirect URL is on our domain (prevents open redirect vulnerabilities)
 */
export function isValidRedirect(url: string): boolean {
  try {
    const parsed = new URL(url, "https://nationalfundforwomen.org");
    return (
      parsed.hostname === "nationalfundforwomen.org" ||
      parsed.hostname === "www.nationalfundforwomen.org"
    );
  } catch {
    return false;
  }
}

/**
 * Builds a login redirect URL with the return URL encoded as the `next` param
 */
export function getLoginRedirectUrl(returnUrl: string): string {
  if (isValidRedirect(returnUrl)) {
    return `/auth/login?next=${encodeURIComponent(returnUrl)}`;
  }
  return "/auth/login";
}

/**
 * Extracts and validates the `next` param from a URL or state
 */
export function getValidatedNextUrl(
  nextParam: string | null,
  stateParam: string | null,
  defaultUrl: string = "/dashboard"
): string {
  // Try state param first (for OAuth flows)
  if (stateParam) {
    try {
      const state = JSON.parse(stateParam);
      if (state.next && isValidRedirect(state.next)) {
        return state.next;
      }
    } catch {
      // Invalid JSON, continue to next options
    }
  }

  // Try next query param (for password login)
  if (nextParam && isValidRedirect(nextParam)) {
    return nextParam;
  }

  // Default fallback
  return defaultUrl;
}

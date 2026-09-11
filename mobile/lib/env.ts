/**
 * Typed access to EXPO_PUBLIC_* environment variables.
 * These are inlined at build time by Metro — they are NOT secret.
 * See .env.example for documentation.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[env] Missing ${name}. Copy mobile/.env.example to mobile/.env and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  /** Base URL of the Next.js app whose /api/* routes the mobile app calls. */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://www.nationalfundforwomen.org").replace(
    /\/$/,
    "",
  ),
  /** Public site URL for links opened in the system browser (upgrade, manage subscription, legal). */
  siteUrl: "https://www.nationalfundforwomen.org",
  /** Deep-link scheme registered in app.json */
  scheme: "nfw",
} as const;

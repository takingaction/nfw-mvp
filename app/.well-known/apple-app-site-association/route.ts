import { NextResponse } from "next/server";

/**
 * Apple Universal Links association file for the NFW mobile app.
 * https://developer.apple.com/documentation/xcode/supporting-associated-domains
 *
 * Served at https://www.nationalfundforwomen.org/.well-known/apple-app-site-association
 * (no file extension, Content-Type application/json, no redirects).
 *
 * Requires env APPLE_TEAM_ID (from the Apple Developer account). Until it's set this
 * returns 404 so iOS simply doesn't associate the domain — nothing on the web changes.
 *
 * Bundle ID must match mobile/app.json → ios.bundleIdentifier.
 */
const BUNDLE_ID = "org.nationalfundforwomen.app";

/** Paths the app should open. Everything else stays in Safari. */
const APP_PATHS = [
  "/perks",
  "/perks/*",
  "/grants",
  "/grants/*",
  "/store",
  "/store/*",
  "/dashboard",
  "/auth/callback",
  "/auth/callback?*",
  "/auth/confirm",
  "/auth/confirm?*",
];

/** Paths under the prefixes above that must stay on the web. */
const WEB_ONLY_PATHS = ["/perks/info", "/store/info", "/grants/connect/*"];

// Read env at request time so adding the variable in Vercel takes effect without a rebuild.
export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const appID = `${teamId}.${BUNDLE_ID}`;
  const body = {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [
            ...WEB_ONLY_PATHS.map((p) => ({ "/": p, exclude: true })),
            ...APP_PATHS.map((p) => (p.includes("?") ? { "/": p.split("?")[0], "?": { "*": "*" } } : { "/": p })),
          ],
        },
      ],
    },
    webcredentials: { apps: [appID] },
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

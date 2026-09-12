import { NextResponse } from "next/server";

/**
 * Android App Links digital asset links for the NFW mobile app.
 * https://developer.android.com/training/app-links/verify-android-applinks
 *
 * Served at https://www.nationalfundforwomen.org/.well-known/assetlinks.json
 *
 * Requires env ANDROID_SHA256_CERT_FINGERPRINTS — comma-separated SHA-256 fingerprints
 * of the release signing key(s). EAS-managed keystore: `eas credentials -p android`.
 * Until set this returns 404 and Android falls back to the browser — no web impact.
 *
 * Package name must match mobile/app.json → android.package.
 */
const PACKAGE_NAME = "org.nationalfundforwomen.app";

// Read env at request time so adding the variable in Vercel takes effect without a rebuild.
export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
  if (!raw) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const fingerprints = raw
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

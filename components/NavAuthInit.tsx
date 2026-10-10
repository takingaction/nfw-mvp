"use client";

import { initNavAuth } from "@/lib/nav-auth-store";

/**
 * Mounted once in the root layout. Renders nothing, but kicks off the
 * shared nav-auth store. Accepts the server's cookie-derived
 * `initialSignedIn` so the first paint matches the server-rendered nav
 * (avoids the "Join Now flash for logged-in users" the original report
 * was about).
 */
export default function NavAuthInit({
  initialSignedIn,
}: {
  initialSignedIn: boolean;
}) {
  // Sync seed for first paint. Safe to call multiple times.
  initNavAuth(initialSignedIn);
  return null;
}

import { NextResponse } from "next/server";

/**
 * Thin, unauthenticated HTML host for the Access Travel SDK, used by the mobile app's
 * WebView (app/(tabs)/perks/travel.tsx).
 *
 * Why this exists: the SDK only loads from domains whitelisted by Access Development, so a
 * WebView can't inject the SDK into local HTML. The app first calls POST /api/travel/token
 * (Bearer) to mint a 5-minute single-use session token, then loads
 *   https://www.nationalfundforwomen.org/travel/embed?session_token=…
 *
 * The token is the only credential — no cookies are needed. Session expiry is relayed to
 * the app via window.ReactNativeWebView.postMessage so it can mint a new token and reload.
 */
export const dynamic = "force-dynamic";

const SDK_URL = "https://booking.accessdevelopment.com/scripts/travel.client.v2.js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get("session_token") ?? "";
  const startTab = searchParams.get("start_tab") ?? "";

  if (!/^[A-Za-z0-9._~-]{10,512}$/.test(sessionToken)) {
    return new NextResponse("Missing or invalid session_token", { status: 400 });
  }

  const navigateTo = startTab && /^[a-z_]+$/.test(startTab) ? `{ view: "home", start_tab: ${JSON.stringify(startTab)} }` : `{ view: "home" }`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="robots" content="noindex" />
  <title>Travel Benefits</title>
  <script src="${SDK_URL}"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #F6F5F0; -webkit-text-size-adjust: 100%; }
    #travel-container { width: 100%; min-height: 100vh; }
    #status { font-family: -apple-system, system-ui, sans-serif; font-size: 14px; color: #2E1F38; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div id="status">Loading travel benefits…</div>
  <div id="travel-container"></div>
  <script>
    (function () {
      var post = function (msg) {
        try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
      };
      var status = document.getElementById("status");
      var setStatus = function (t) { if (status) status.textContent = t; };

      function start() {
        if (!window.travelClient) { setStatus("Travel booking is unavailable right now."); post({ type: "error", message: "SDK not loaded" }); return; }
        try {
          window.travelClient.start({
            session_token: ${JSON.stringify(sessionToken)},
            container: "#travel-container",
            height: "fit",
            width: "100%",
            navigate_to: ${navigateTo}
          });
          if (window.travelClient.on) {
            window.travelClient.on("error", function (e) { post({ type: "error", code: e && e.error_code, message: e && e.error_message }); });
            window.travelClient.on("update", function (e) {
              var code = e && e.update_code;
              if (code === "TRAVEL_CLIENT_LOADED") { if (status) status.remove(); post({ type: "loaded" }); }
              if (code === "TRAVEL_CLIENT_SESSION_EXPIRED" || code === "SESSION_NOT_FOUND") post({ type: "session_expired", code: code });
            });
          }
          setTimeout(function () { if (status) status.remove(); }, 8000);
        } catch (err) {
          setStatus("Travel booking is unavailable right now.");
          post({ type: "error", message: String(err && err.message || err) });
        }
      }

      if (window.travelClient) start(); else window.addEventListener("load", start);
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

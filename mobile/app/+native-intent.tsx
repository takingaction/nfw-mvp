import { mapWebPathToAppRoute } from "@/lib/notifications";

/**
 * Expo Router native intent hook — rewrites incoming deep links before routing.
 * https://docs.expo.dev/router/advanced/native-intent/
 *
 * Handles:
 *   - Universal / App Links: https://www.nationalfundforwomen.org/perks/nfw/<slug>, /grants/view/<id>,
 *     /store, /auth/confirm?token_hash=… (AASA + assetlinks served by the web app)
 *   - Custom scheme: nfw://auth/callback?code=…, nfw://grants/connect/return?grantId=…
 *
 * Website paths differ from app routes (e.g. /grants/view/<id> → /(tabs)/grants/<id>), so
 * everything funnels through mapWebPathToAppRoute(), which is shared with push-tap routing.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // `path` may be a full URL for universal links or just a path for scheme links.
    let pathname = path;
    let search = "";
    if (/^[a-z]+:\/\//i.test(path)) {
      const url = new URL(path);
      pathname = url.pathname;
      search = url.search;
      // nfw://auth/callback → host is "auth", pathname "/callback"
      if (url.protocol === "nfw:" && url.host) pathname = `/${url.host}${url.pathname}`;
    } else {
      const i = path.indexOf("?");
      if (i >= 0) {
        pathname = path.slice(0, i);
        search = path.slice(i);
      }
    }
    return mapWebPathToAppRoute(`${pathname}${search}`);
  } catch {
    return "/";
  }
}

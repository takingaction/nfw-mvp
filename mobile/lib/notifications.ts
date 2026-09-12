import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { colors } from "@/constants/colors";
import { api, apiDelete, apiGet } from "@/lib/api";

/**
 * Push notifications.
 *
 * Server side: push_tokens table (migration 161), POST/DELETE /api/push/register,
 * lib/push.ts sends via Expo's push API when grant status changes.
 *
 * Client side: request permission → getExpoPushTokenAsync(projectId) → register.
 * Tapping a notification routes via `data.url` (e.g. "/grants/<id>").
 *
 * NOTE: remote push does not work in Expo Go (SDK 53+). Test with a development build.
 */

const TOKEN_KEY = "nfw.pushToken";
const PREF_KEY = "nfw.pushEnabled"; // member-level toggle, mirrored server-side via `enabled`

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

export async function getPushPermission(): Promise<PushPermission> {
  if (!Device.isDevice) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.aubergine,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined;
}

/** Whether the member has turned notifications on in Settings (default true once permission granted). */
export async function isPushPreferenceEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PREF_KEY);
  return v === null ? true : v === "true";
}

export async function setPushPreference(enabled: boolean) {
  await AsyncStorage.setItem(PREF_KEY, String(enabled));
}

/**
 * Request permission (if needed), fetch the Expo token and register it with the API.
 * Returns the token, or null when unsupported / denied / not on a device.
 */
export async function registerForPushNotifications(opts: { requestPermission?: boolean } = {}): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureAndroidChannel();

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && opts.requestPermission) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return null;

  const id = projectId();
  const { data: token } = id ? await Notifications.getExpoPushTokenAsync({ projectId: id }) : await Notifications.getExpoPushTokenAsync();

  const enabled = await isPushPreferenceEnabled();
  try {
    await api("/api/push/register", {
      method: "POST",
      body: {
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        deviceName: Device.modelName ?? Device.deviceName ?? undefined,
        enabled,
      },
    });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn("[notifications] register failed", err);
  }
  return token;
}

/** Remove this device's token server-side (sign-out or opt-out). Never throws. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await apiDelete("/api/push/register", { body: { token } });
  } catch (err) {
    console.warn("[notifications] unregister failed", err);
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getRegisteredTokens() {
  return apiGet<{ tokens: { token: string; platform: string; enabled: boolean; device_name: string | null; last_seen_at: string }[] }>("/api/push/register");
}

/** Resolve an in-app route from a notification payload. */
export function routeFromNotificationData(data: Record<string, unknown> | undefined | null): string | null {
  if (!data) return null;
  const url = typeof data.url === "string" ? data.url : null;
  if (url && url.startsWith("/") && !url.startsWith("//")) return mapWebPathToAppRoute(url);
  if (data.type === "grant_status" && typeof data.grantId === "string") return `/(tabs)/grants/${data.grantId}`;
  return null;
}

/**
 * Map website-style paths (used in push payloads and universal links) to Expo Router routes.
 * Shared with app/+native-intent.tsx.
 */
export function mapWebPathToAppRoute(path: string): string {
  const [pathname, query = ""] = path.split("?");
  const q = query ? `?${query}` : "";
  const segs = pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (segs.length === 0 || segs[0] === "dashboard") return "/(tabs)/dashboard";

  if (segs[0] === "grants") {
    if (segs[1] === "view" && segs[2]) return `/(tabs)/grants/${segs[2]}`;
    if (segs[1] === "apply") return `/(tabs)/grants/apply${q}`;
    if (segs[1] === "my-applications") return "/(tabs)/grants/my-applications";
    if (segs[1] === "connect" && (segs[2] === "return" || segs[2] === "refresh")) return `/(tabs)/grants/connect/${segs[2]}${q}`;
    if (segs[1] && !["view", "apply", "connect"].includes(segs[1])) return `/(tabs)/grants/${segs[1]}`;
    return "/(tabs)/grants";
  }

  if (segs[0] === "perks") {
    if (segs[1] === "nfw" && segs[2]) return `/(tabs)/perks/nfw/${segs[2]}`;
    if (segs[1] === "history") return "/(tabs)/perks/history";
    if (segs[1] === "travel") return "/(tabs)/perks/travel";
    if (!segs[1]) {
      const m = /(?:^|&)collection=([^&]+)/.exec(query);
      if (m) return `/(tabs)/perks/collections/${decodeURIComponent(m[1])}`;
      return "/(tabs)/perks";
    }
    return `/(tabs)/perks/${segs[1]}`;
  }

  if (segs[0] === "store") {
    if (segs[1] === "my-claims") return "/store/my-claims";
    return "/store";
  }

  if (segs[0] === "travel") return "/(tabs)/perks/travel";
  if (segs[0] === "profile") return segs[1] === "edit" ? "/(tabs)/settings/profile/edit" : "/(tabs)/settings/profile";
  if (segs[0] === "contact") return "/contact";
  if (segs[0] === "faq") return "/faq";
  if (segs[0] === "share-your-story") return "/share-your-story";
  if (segs[0] === "auth") {
    if (segs[1] === "callback" || segs[1] === "confirm") return `/auth/callback${q}`;
    if (segs[1] === "update-password") return "/auth/update-password";
    if (segs[1] === "login") return `/auth/login${q}`;
    if (segs[1] === "sign-up") return "/auth/sign-up";
  }
  return path; // unknown → let the router try it (falls through to +not-found)
}

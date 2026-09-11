import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { colors } from "@/constants/colors";

/**
 * Push notification setup (Phase 2 stub).
 *
 * Registering the Expo push token with the backend requires the new
 * `POST /api/push/register` route + `push_tokens` table on the web side
 * (see mobile/migration-blueprint.md → Dependencies #2). Until that exists,
 * `registerForPushNotifications` returns the token without persisting it.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[notifications] push requires a physical device");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: colors.aubergine,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync();

  // TODO (Phase 3): await api("/api/push/register", { method: "POST", body: { token, platform: Platform.OS } });
  return token;
}

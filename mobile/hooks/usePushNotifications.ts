import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { registerForPushNotifications, routeFromNotificationData } from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth";

/**
 * Mount once in the root layout.
 *  - When a session exists and OS permission is already granted, (re)registers the token
 *    silently so the server always has a fresh one. Permission is only *requested* from the
 *    Notifications settings screen (no cold-start prompt).
 *  - Routes notification taps (foreground, background, and cold start) via `data.url`.
 */
export function usePushNotifications() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const router = useRouter();
  const lastRegisteredFor = useRef<string | null>(null);

  // Silent re-registration on sign-in / app start
  useEffect(() => {
    if (status !== "authenticated" || !userId || lastRegisteredFor.current === userId) return;
    lastRegisteredFor.current = userId;
    void registerForPushNotifications({ requestPermission: false });
  }, [status, userId]);

  // Tap handling
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      const route = routeFromNotificationData(response?.notification.request.content.data as Record<string, unknown> | undefined);
      if (route) router.push(route as never);
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    // Cold start: the response that launched the app
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) handle(r);
    });
    return () => sub.remove();
  }, [router]);
}

import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState, Linking, Platform, StyleSheet, Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { getPushPermission, isPushPreferenceEnabled, registerForPushNotifications, setPushPreference, unregisterPushToken, type PushPermission } from "@/lib/notifications";

/**
 * Notification preferences (new on mobile; the web has no equivalent).
 * Build phase: 6
 *
 * One toggle: grant application updates (approved / not approved / payment sent).
 * Turning on requests OS permission and registers the token; turning off removes it.
 */
export default function NotificationSettingsScreen() {
  const state = useQuery({
    queryKey: ["push-state"],
    queryFn: async () => ({ permission: await getPushPermission(), enabled: await isPushPreferenceEnabled() }),
    staleTime: 0,
  });
  const permission: PushPermission = state.data?.permission ?? "undetermined";
  const enabled = state.data?.enabled ?? true;
  const refresh = () => state.refetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isExpoGo = Constants.appOwnership === "expo";

  // Re-check OS permission when the member returns from Settings.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void state.refetch();
    });
    return () => sub.remove();
  }, [state]);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setPushPreference(next);
      if (next) {
        const token = await registerForPushNotifications({ requestPermission: true });
        await refresh();
        if (!token) {
          const p = await getPushPermission();
          if (p === "denied") setError("Notifications are turned off for NFW in your device settings.");
          else if (p === "unsupported") setError("Push notifications require a physical device.");
        }
      } else {
        await unregisterPushToken();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update notification settings");
    } finally {
      setBusy(false);
    }
  }

  const effectiveOn = enabled && permission === "granted";

  return (
    <Screen>
      <Heading>Notifications</Heading>
      <Body tone="muted" style={{ marginTop: 6 }}>Get a heads-up when something changes on your microgrant applications.</Body>

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="ribbon-outline" size={20} color={colors.aubergine} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Grant application updates</Label>
            <Caption>Approved, not approved, and payment sent</Caption>
          </View>
          <Switch value={effectiveOn} onValueChange={toggle} disabled={busy || permission === "unsupported"} trackColor={{ true: colors.wisteria, false: "#d4d4d4" }} thumbColor={colors.white} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      {permission === "denied" && (
        <Card surface="citrine" bordered={false} style={styles.card}>
          <Label>Turned off in device settings</Label>
          <Caption tone="default">Allow notifications for NFW in {Platform.OS === "ios" ? "Settings → Notifications" : "your system settings"} to receive updates.</Caption>
          <Button label="Open Settings" variant="primary" size="sm" onPress={() => Linking.openSettings()} style={styles.inlineButton} />
        </Card>
      )}

      {!Device.isDevice && (
        <Card surface="dove" bordered={false} style={styles.card}>
          <Caption>Push notifications aren&apos;t available in the simulator.</Caption>
        </Card>
      )}
      {isExpoGo && Device.isDevice && (
        <Card surface="dove" bordered={false} style={styles.card}>
          <Caption>Remote notifications don&apos;t arrive in Expo Go. Install a development or TestFlight build to test them.</Caption>
        </Card>
      )}

      <Caption style={styles.footnote}>Email notifications from NFW are managed separately and aren&apos;t affected by this setting.</Caption>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, marginTop: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, backgroundColor: colors.dove, alignItems: "center", justifyContent: "center" },
  inlineButton: { alignSelf: "flex-start", marginTop: 4 },
  error: { fontFamily: fonts.ui, fontSize: 13, color: colors.statusRed },
  footnote: { marginTop: 20, textAlign: "center" },
});

import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

/**
 * Persistent "You're offline" strip overlaid at the top of the screen (above the header). Only renders when NetInfo is
 * certain there is no connection (isConnected === false) — `null` (unknown) stays hidden so
 * it never flashes on cold start.
 */
export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const insets = useSafeAreaInsets();
  const offline = isConnected === false || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.banner, { paddingTop: insets.top + 6 }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.blackberry} />
      <Text style={styles.text}>{"You're offline. Some content may be out of date."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.citrine,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  text: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.blackberry },
});

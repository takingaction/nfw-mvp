import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors, theme } from "@/constants/colors";
import { useAuthStore } from "@/stores/auth";

/**
 * Entry route — mobile equivalent of proxy.ts / app/page.tsx auth redirect.
 * While the session is being restored from secure storage we show a spinner
 * (the native splash is still visible at this point, so this is rarely seen).
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.aubergine} />
      </View>
    );
  }

  return <Redirect href={status === "authenticated" ? "/(tabs)/dashboard" : "/auth/login"} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.background,
  },
});

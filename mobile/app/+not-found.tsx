import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, theme } from "@/constants/colors";

/**
 * Web equivalent:
 *   - app/not-found.tsx
 * Build phase: 1
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          Go to home screen
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: theme.background },
  title: { fontSize: 20, fontWeight: "600", color: theme.text },
  link: { marginTop: 16, paddingVertical: 12, fontSize: 14, fontWeight: "700", color: colors.aubergine },
});

import { Stack } from "expo-router";

import { brandStackOptions } from "@/lib/navigation/stackOptions";

/**
 * Zero Dollar Store — root-level stack (not a tab).
 * Entered from Dashboard "Browse the Zero Dollar Store" and Perks.
 */
export default function StoreLayout() {
  return (
    <Stack screenOptions={brandStackOptions}>
      <Stack.Screen name="index" options={{ title: "Zero Dollar Store" }} />
      <Stack.Screen name="[productId]" options={{ title: "Product" }} />
      <Stack.Screen
        name="claim/[productId]"
        options={{ title: "Claim Item", presentation: "modal" }}
      />
      <Stack.Screen name="my-claims" options={{ title: "My Claims" }} />
    </Stack>
  );
}

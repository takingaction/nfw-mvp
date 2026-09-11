import { Stack } from "expo-router";

import { brandStackOptions } from "@/lib/navigation/stackOptions";

export default function GrantsLayout() {
  return (
    <Stack screenOptions={brandStackOptions}>
      <Stack.Screen name="index" options={{ title: "Microgrants" }} />
      <Stack.Screen name="apply/index" options={{ title: "Apply" }} />
      <Stack.Screen
        name="apply/confirm"
        options={{ title: "Confirm & Submit", presentation: "modal" }}
      />
      <Stack.Screen name="my-applications" options={{ title: "My Applications" }} />
      <Stack.Screen name="[id]" options={{ title: "Application" }} />
      <Stack.Screen
        name="application-success"
        options={{ title: "Submitted", headerBackVisible: false }}
      />
      <Stack.Screen name="connect/return" options={{ title: "Bank Account" }} />
      <Stack.Screen name="connect/refresh" options={{ title: "Bank Account" }} />
    </Stack>
  );
}

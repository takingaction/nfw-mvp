import { Stack } from "expo-router";

import { brandStackOptions } from "@/lib/navigation/stackOptions";

export default function DashboardLayout() {
  return (
    <Stack screenOptions={brandStackOptions}>
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
    </Stack>
  );
}

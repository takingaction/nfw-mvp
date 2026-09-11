import { Stack } from "expo-router";

import { brandStackOptions } from "@/lib/navigation/stackOptions";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={brandStackOptions}>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="profile/index" options={{ title: "My Profile" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="membership" options={{ title: "Membership" }} />
      <Stack.Screen
        name="redeem-gift-code"
        options={{ title: "Redeem Gift Code", presentation: "modal" }}
      />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen
        name="delete-account"
        options={{ title: "Delete Account", presentation: "modal" }}
      />
    </Stack>
  );
}

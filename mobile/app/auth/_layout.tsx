import { Stack } from "expo-router";

import { brandStackOptions } from "@/lib/navigation/stackOptions";

/**
 * Auth stack. Session-based redirects are handled by the root layout
 * (app/_layout.tsx) and app/index.tsx, not here — several auth routes are
 * legitimately visited while signed in (post-confirmation signup steps,
 * OAuth callback, password update, welcome).
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ ...brandStackOptions, headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up/index" />
      <Stack.Screen name="sign-up/profile" options={{ headerShown: true, title: "Personal Info" }} />
      <Stack.Screen name="sign-up/identity" options={{ headerShown: true, title: "About You" }} />
      <Stack.Screen name="sign-up/membership" options={{ headerShown: true, title: "Membership" }} />
      <Stack.Screen name="sign-up-success" />
      <Stack.Screen name="forgot-password" options={{ headerShown: true, title: "Reset Password" }} />
      <Stack.Screen name="update-password" options={{ headerShown: true, title: "New Password" }} />
      <Stack.Screen name="callback" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="waitlist-confirmed" />
      <Stack.Screen name="error" />
    </Stack>
  );
}

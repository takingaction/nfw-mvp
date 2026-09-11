import { Stack } from "expo-router";

import { brandStackOptions } from "@/lib/navigation/stackOptions";

export default function PerksLayout() {
  return (
    <Stack screenOptions={brandStackOptions}>
      <Stack.Screen name="index" options={{ title: "Perks" }} />
      <Stack.Screen name="filters" options={{ title: "Filters", presentation: "modal" }} />
      <Stack.Screen name="store/[storeKey]" options={{ title: "Store" }} />
      <Stack.Screen name="[offerKey]" options={{ title: "Offer" }} />
      <Stack.Screen name="nfw/[slug]" options={{ title: "NFW Exclusive" }} />
      <Stack.Screen name="collections/[slug]" options={{ title: "Collection" }} />
      <Stack.Screen name="saved" options={{ title: "Saved Brands" }} />
      <Stack.Screen name="history" options={{ title: "Redeemed Perks" }} />
      <Stack.Screen name="travel" options={{ title: "Travel" }} />
    </Stack>
  );
}

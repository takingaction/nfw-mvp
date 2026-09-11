import type { Stack } from "expo-router";
import type { ComponentProps } from "react";

import { colors, theme } from "@/constants/colors";

/**
 * Native-stack screen options type, derived from expo-router's Stack so we
 * don't depend on the transitive @react-navigation/native-stack package
 * (expo-router vendors its own fork).
 */
type ScreenOptionsProp = NonNullable<ComponentProps<typeof Stack.Screen>["options"]>;
export type StackScreenOptions = Exclude<ScreenOptionsProp, (...args: never[]) => unknown>;

/** Shared native-stack header styling used by every stack in the app. */
export const brandStackOptions: StackScreenOptions = {
  headerStyle: { backgroundColor: colors.aubergine },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: "700" },
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: theme.background },
};

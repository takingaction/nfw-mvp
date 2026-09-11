import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { colors, theme } from "@/constants/colors";

type IoniconName = keyof typeof Ionicons.glyphMap;

type TabIconProps = { color: ColorValue; focused: boolean; size: number };

function tabIcon(focused: IoniconName, unfocused: IoniconName) {
  const TabIcon = ({ color, focused: isFocused, size }: TabIconProps) => (
    <Ionicons name={isFocused ? focused : unfocused} size={size} color={color} />
  );
  TabIcon.displayName = `TabIcon(${focused})`;
  return TabIcon;
}

/**
 * Primary bottom-tab navigator.
 * Tabs: Dashboard · Grants · Perks · Settings
 * Zero Dollar Store lives in a root-level stack (app/store) reached from Dashboard/Perks.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tabs.Screen
        name="grants"
        options={{ title: "Grants", tabBarIcon: tabIcon("ribbon", "ribbon-outline") }}
      />
      <Tabs.Screen
        name="perks"
        options={{ title: "Perks", tabBarIcon: tabIcon("pricetags", "pricetags-outline") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: tabIcon("person-circle", "person-circle-outline") }}
      />
    </Tabs>
  );
}

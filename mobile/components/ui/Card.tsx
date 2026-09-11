import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { colors, theme } from "@/constants/colors";

type Surface = "white" | "dove" | "aubergine" | "wisteria" | "lilac" | "citrine";

const SURFACES: Record<Surface, string> = {
  white: colors.white,
  dove: colors.dove,
  aubergine: colors.aubergine,
  wisteria: colors.wisteria,
  lilac: colors.lilac,
  citrine: colors.citrine,
};

type CardProps = ViewProps & {
  surface?: Surface;
  padded?: boolean;
  bordered?: boolean;
};

/** Square-cornered surface (matches web dashboard — no border radius). */
export function Card({ surface = "white", padded = true, bordered = true, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: SURFACES[surface] },
        bordered && surface === "white" && styles.bordered,
        padded && styles.padded,
        style,
      ]}
    />
  );
}

type PressableCardProps = Omit<PressableProps, "style"> & {
  surface?: Surface;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PressableCard({ surface = "white", padded = true, style, ...rest }: PressableCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: SURFACES[surface] },
        surface === "white" && styles.bordered,
        padded && styles.padded,
        pressed && styles.pressed,
        style,
      ]}
    />
  );
}

/** Full-bleed section band (web: `<section className="bg-nfw-wisteria py-16">`). */
export function Section({ surface = "dove", style, ...rest }: CardProps) {
  return <View {...rest} style={[styles.section, { backgroundColor: SURFACES[surface] }, style]} />;
}

const styles = StyleSheet.create({
  card: {},
  bordered: { borderWidth: 1, borderColor: theme.border },
  padded: { padding: 16 },
  pressed: { opacity: 0.9 },
  section: { paddingHorizontal: 20, paddingVertical: 28, gap: 16 },
});

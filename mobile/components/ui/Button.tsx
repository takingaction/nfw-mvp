import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export type ButtonVariant = "primary" | "accent" | "secondary" | "tertiary" | "ghost" | "danger";
type Size = "md" | "sm";

type Props = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Brand button. Web equivalents:
 *  primary   → aubergine bg, white text        (getPrimaryButtonClass on dark bg)
 *  accent    → citrine bg, blackberry text     (most CTAs: "Apply", "Claim Item", dashboard)
 *  secondary → wisteria bg, white text         (hero buttons, "Upgrade")
 *  tertiary  → lilac bg, white text            ("Explore Perks", "Connect Bank Account")
 *  ghost     → transparent, aubergine border/text
 *
 * Labels are DM Sans 900, uppercase, tracked — no border radius (matches web dashboard).
 */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: Props) {
  const palette = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        { backgroundColor: palette.bg, borderColor: palette.border ?? palette.bg },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.label, size === "sm" && styles.labelSm, { color: palette.text }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.aubergine, text: colors.white },
  accent: { bg: colors.citrine, text: colors.blackberry },
  secondary: { bg: colors.wisteria, text: colors.white },
  tertiary: { bg: colors.lilac, text: colors.white },
  ghost: { bg: "transparent", text: colors.aubergine, border: colors.aubergine },
  danger: { bg: colors.statusRed, text: colors.white },
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minHeight: 48,
  },
  sm: { paddingVertical: 10, paddingHorizontal: 14, minHeight: 38 },
  fullWidth: { alignSelf: "stretch" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: fonts.uiBlack,
    fontSize: 13,
    letterSpacing: 0.78,
    textTransform: "uppercase",
  },
  labelSm: { fontSize: 11, letterSpacing: 0.66 },
});

import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Props = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
};

/** "Continue with Google" — matches the web login-form's outlined style. */
export function GoogleButton({ onPress, loading, disabled, label = "Continue with Google" }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.aubergine} />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color={theme.text} />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.uiBold, fontSize: 14, color: theme.text },
});

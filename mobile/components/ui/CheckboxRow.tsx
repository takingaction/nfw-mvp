import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Props = {
  label: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Radio look (square dot) instead of a check. */
  radio?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Shared checkbox / radio row — wisteria fill when selected (web brand rule). */
export function CheckboxRow({ label, checked, onPress, disabled, radio, style }: Props) {
  return (
    <Pressable
      accessibilityRole={radio ? "radio" : "checkbox"}
      accessibilityState={radio ? { selected: checked, disabled } : { checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, checked && styles.rowChecked, disabled && styles.disabled, style]}
    >
      <Pressable pointerEvents="none" style={[styles.box, checked && styles.boxChecked]}>
        {checked ? radio ? <Text style={styles.dot} /> : <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border },
  rowChecked: { borderColor: colors.wisteria, backgroundColor: "rgba(119,134,190,0.08)" },
  disabled: { opacity: 0.5 },
  box: { width: 20, height: 20, borderWidth: 1.5, borderColor: colors.aubergine, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  boxChecked: { backgroundColor: colors.wisteria, borderColor: colors.wisteria },
  dot: { width: 8, height: 8, backgroundColor: colors.white },
  label: { flex: 1, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: theme.text },
});

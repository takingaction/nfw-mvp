import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Option = { value: string; label?: string };

type Props = {
  label?: string;
  value: string;
  options: readonly (string | Option)[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
};

/** Native-feeling replacement for `<select>`: a field that opens a bottom-sheet list. */
export function Select({ label, value, options, onChange, placeholder = "Select", error, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const normalized: Option[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = normalized.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, !!error && styles.errored, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !current && styles.placeholder]} numberOfLines={1}>
          {current?.label ?? current?.value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label ?? placeholder}</Text>
            <Pressable accessibilityLabel="Close" hitSlop={10} onPress={() => setOpen(false)}>
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>
          <FlatList
            data={normalized}
            keyExtractor={(o) => o.value}
            style={{ maxHeight: 420 }}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label ?? item.value}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={colors.aubergine} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.4, color: theme.text, textTransform: "uppercase" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  errored: { borderColor: colors.statusRed },
  disabled: { opacity: 0.5 },
  value: { flex: 1, fontFamily: fonts.ui, fontSize: 16, color: theme.text },
  placeholder: { color: "rgba(46,31,56,0.4)" },
  error: { fontFamily: fonts.ui, fontSize: 13, color: colors.statusRed },
  scrim: { flex: 1, backgroundColor: "rgba(46,31,56,0.45)" },
  sheet: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: theme.border },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  sheetTitle: { fontFamily: fonts.uiBold, fontSize: 14, color: theme.text, textTransform: "uppercase", letterSpacing: 0.5 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  optionActive: { backgroundColor: colors.dove },
  optionText: { fontFamily: fonts.ui, fontSize: 16, color: theme.text },
  optionTextActive: { fontFamily: fonts.uiBold, color: colors.aubergine },
});

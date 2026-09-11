import { forwardRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
};

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        placeholderTextColor="rgba(46,31,56,0.4)"
        style={[styles.input, focused && styles.focused, !!error && styles.errored, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.4, color: theme.text, textTransform: "uppercase" },
  input: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: theme.text,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  focused: { borderColor: colors.aubergine },
  errored: { borderColor: colors.statusRed },
  error: { fontFamily: fonts.ui, fontSize: 13, color: colors.statusRed },
  hint: { fontFamily: fonts.ui, fontSize: 12, color: theme.textMuted },
});

import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { isoToUs, usToIso } from "@/lib/dates";

export { isoToUs, usToIso };

type Props = {
  label?: string;
  /** ISO YYYY-MM-DD or "" */
  value: string;
  onChange: (iso: string) => void;
  minIso?: string;
  maxIso?: string;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  nativeID?: string;
};

/**
 * MM/DD/YYYY masked text field that stores YYYY-MM-DD, replacing the web's
 * `<input type="date" min max>`. Validates range on blur.
 */
export function DateField({ label, value, onChange, minIso, maxIso, hint, error, disabled, nativeID }: Props) {
  const [text, setText] = useState(isoToUs(value));
  const [localError, setLocalError] = useState<string | null>(null);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(isoToUs(value));
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(masked);
    setLocalError(null);
    if (digits.length === 8) {
      const iso = usToIso(masked);
      if (iso) onChange(iso);
    } else if (value) {
      onChange("");
    }
  }

  function handleBlur() {
    if (!text) return;
    const iso = usToIso(text);
    if (!iso) {
      setLocalError("Enter a valid date (MM/DD/YYYY)");
      return;
    }
    if (minIso && iso < minIso) setLocalError(`Date must be on or after ${isoToUs(minIso)}`);
    else if (maxIso && iso > maxIso) setLocalError("You must be 18 or older to join");
    else setLocalError(null);
  }

  const shownError = error ?? localError;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        nativeID={nativeID}
        value={text}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholder="MM/DD/YYYY"
        placeholderTextColor="rgba(46,31,56,0.4)"
        keyboardType="number-pad"
        maxLength={10}
        editable={!disabled}
        style={[styles.input, !!shownError && styles.errored, disabled && styles.disabled]}
      />
      {shownError ? <Text style={styles.error}>{shownError}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.4, color: theme.text, textTransform: "uppercase" },
  input: { fontFamily: fonts.ui, fontSize: 16, color: theme.text, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  errored: { borderColor: colors.statusRed },
  disabled: { opacity: 0.5 },
  error: { fontFamily: fonts.ui, fontSize: 13, color: colors.statusRed },
  hint: { fontFamily: fonts.ui, fontSize: 12, color: theme.textMuted },
});

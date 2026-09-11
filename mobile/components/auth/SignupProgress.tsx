import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { SIGNUP_STEPS } from "@/constants/signup";

/** Web: SignUpFlow progress chips (1 Personal Info · 2 Identity · 3 Membership) + bar. `current` is 1–3. */
export function SignupProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {SIGNUP_STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <View key={label} style={styles.item}>
              <View style={[styles.chip, done && styles.chipDone, active && styles.chipActive]}>
                {done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>}
              </View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${(current / 3) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  item: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  chip: { width: 24, height: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(46,31,56,0.08)" },
  chipDone: { backgroundColor: colors.wisteria },
  chipActive: { backgroundColor: colors.blackberry },
  chipText: { fontFamily: fonts.uiBlack, fontSize: 11, color: "rgba(46,31,56,0.5)" },
  chipTextActive: { color: colors.white },
  label: { flex: 1, fontFamily: fonts.uiBold, fontSize: 11, color: "rgba(46,31,56,0.45)", textTransform: "uppercase", letterSpacing: 0.4 },
  labelActive: { color: theme.text },
  bar: { height: 3, backgroundColor: "rgba(46,31,56,0.08)" },
  fill: { height: 3, backgroundColor: colors.wisteria },
});

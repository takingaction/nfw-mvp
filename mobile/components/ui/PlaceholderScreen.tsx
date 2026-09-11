import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, theme } from "@/constants/colors";

type Props = {
  /** Screen title shown in the UI */
  title: string;
  /** Web page / API route(s) this screen replaces — see mobile/migration-blueprint.md */
  webEquivalent: string | string[];
  /** Build phase from mobile-app.md */
  phase?: number;
  /** Optional notes for the implementer */
  notes?: string;
};

/**
 * Temporary skeleton screen. Every route in the blueprint renders this until
 * it is implemented. Displays its web equivalent so the skeleton is
 * self-documenting when running on device.
 */
export function PlaceholderScreen({ title, webEquivalent, phase, notes }: Props) {
  const insets = useSafeAreaInsets();
  const equivalents = Array.isArray(webEquivalent) ? webEquivalent : [webEquivalent];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.eyebrow}>NOT YET IMPLEMENTED</Text>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Web equivalent</Text>
        {equivalents.map((e) => (
          <Text key={e} style={styles.mono}>
            {e}
          </Text>
        ))}
      </View>

      {phase !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PHASE {phase}</Text>
        </View>
      )}

      {notes && <Text style={styles.notes}>{notes}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { padding: 24, gap: 16 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.72,
    color: colors.wisteria,
  },
  title: { fontSize: 28, color: theme.text, fontWeight: "600" },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.textMuted,
    marginBottom: 4,
  },
  mono: { fontFamily: "Menlo", fontSize: 12, color: theme.text },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.citrine,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5, color: theme.accentText },
  notes: { fontSize: 14, lineHeight: 20, color: theme.textMuted },
});

import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { PressableCard } from "@/components/ui/Card";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { decodeHtml, formatCurrency, formatDateLong } from "@/lib/format";
import type { GrantCycle } from "@/types/grants";

type Props = {
  cycle: Pick<GrantCycle, "id" | "cycle_name" | "amount_per_grant" | "end_date" | "featured_image"> & {
    description?: string | null;
  };
  onPress: () => void;
  /** Compact = horizontal-strip size on the dashboard; default = full-width list card. */
  compact?: boolean;
};

/** Open grant cycle card — web: dashboard "Available Microgrants" + /grants/apply list. */
export function GrantCycleCard({ cycle, onPress, compact }: Props) {
  return (
    <PressableCard onPress={onPress} padded={false} style={[styles.card, compact && styles.compact]}>
      {cycle.featured_image ? (
        <Image source={{ uri: cycle.featured_image }} style={[styles.image, compact && styles.imageCompact]} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.image, compact && styles.imageCompact, styles.imageFallback]} />
      )}
      <View style={styles.body}>
        <Subheading numberOfLines={2} style={compact && styles.titleCompact}>
          {decodeHtml(cycle.cycle_name)}
        </Subheading>
        {!compact && cycle.description ? (
          <Caption numberOfLines={3} style={styles.description}>
            {decodeHtml(cycle.description)}
          </Caption>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.amount}>{formatCurrency(cycle.amount_per_grant)}</Text>
          <Caption>Deadline: {formatDateLong(cycle.end_date)}</Caption>
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  compact: { width: 240 },
  image: { width: "100%", height: 150, backgroundColor: colors.dove },
  imageCompact: { height: 120 },
  imageFallback: { backgroundColor: colors.lilac },
  body: { padding: 14, gap: 6 },
  titleCompact: { fontSize: 16, lineHeight: 21 },
  description: { color: theme.textMuted },
  meta: { gap: 2, marginTop: 4 },
  amount: { fontFamily: fonts.uiBlack, fontSize: 16, color: colors.aubergine },
});

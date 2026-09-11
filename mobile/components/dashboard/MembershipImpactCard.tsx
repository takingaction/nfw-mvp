import { StyleSheet, Text, View } from "react-native";

import { AnimatedCurrency } from "@/components/ui/AnimatedCurrency";
import { Eyebrow } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import type { Savings } from "@/types/dashboard";

type Props = { savings: Savings | undefined; loading?: boolean };

/**
 * Web: components/dashboard/MembershipImpactCard.tsx
 * Aubergine card · eyebrow "Your Membership at Work" · "$X saved" · lilac 3-column
 * breakdown: Microgrants / Perks / Zero Dollar Store.
 *
 * Zero Dollar Store shows "—" until the web API accepts Bearer tokens (needs
 * shopify_product_mappings.compare_at_price via service role).
 */
export function MembershipImpactCard({ savings, loading }: Props) {
  const total = savings?.total ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Eyebrow tone="accent">Your Membership at Work</Eyebrow>
        <View style={styles.totalRow}>
          <AnimatedCurrency value={loading ? 0 : total} style={styles.total} />
          <Text style={styles.saved}> saved</Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <Stat label="Microgrants" value={savings?.microgrants} />
        <Stat label="Perks" value={savings?.perks} />
        <Stat label="Zero Dollar Store" value={savings?.zeroDollarStore ?? null} last />
      </View>
    </View>
  );
}

function Stat({ label, value, last }: { label: string; value: number | null | undefined; last?: boolean }) {
  return (
    <View style={[styles.stat, !last && styles.statBorder]}>
      {value === null ? (
        <Text style={styles.statValue}>—</Text>
      ) : (
        <AnimatedCurrency value={value ?? 0} style={styles.statValue} />
      )}
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.aubergine },
  top: { padding: 24, gap: 6 },
  totalRow: { flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap" },
  total: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, color: colors.white },
  saved: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 44, color: colors.white },
  breakdown: { backgroundColor: colors.lilac, flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", paddingVertical: 18, paddingHorizontal: 8, gap: 4 },
  statBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.35)" },
  statValue: { fontFamily: fonts.serifSemiBold, fontSize: 22, color: colors.white },
  statLabel: { fontFamily: fonts.uiBlack, fontSize: 10, letterSpacing: 0.6, color: colors.white, textAlign: "center" },
});

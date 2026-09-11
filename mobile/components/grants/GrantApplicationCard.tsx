import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { PressableCard } from "@/components/ui/Card";
import { Caption, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { decodeHtml, formatCurrency, formatDateLong } from "@/lib/format";
import { GRANT_STATUS_LABELS, GRANT_STATUS_LABELS_DASHBOARD, GRANT_STATUS_TONES, type GrantWithCycle } from "@/types/grants";

type Props = {
  grant: GrantWithCycle;
  onPress: () => void;
  /** Dashboard variant uses "Paid!" and hides the answer preview. */
  variant?: "list" | "dashboard";
};

/**
 * Web: card in app/grants/my-applications/page.tsx (list) and
 * components/dashboard/YourMicrograntsSection.tsx (dashboard).
 */
export function GrantApplicationCard({ grant, onPress, variant = "list" }: Props) {
  const labels = variant === "dashboard" ? GRANT_STATUS_LABELS_DASHBOARD : GRANT_STATUS_LABELS;
  const label = labels[grant.status] ?? grant.status;
  const tone = GRANT_STATUS_TONES[grant.status] ?? "neutral";
  const cycle = grant.grant_cycles;

  const amount = grant.amount_approved ?? cycle?.amount_per_grant ?? null;
  const amountLabel = grant.amount_approved ? "Approved amount" : "Grant amount";
  const needsBank = grant.status === "approved" && !grant.stripe_connect_account_id;

  return (
    <PressableCard onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badges}>
          <Badge label={label} tone={tone} />
          {grant.is_nominating ? <Badge label="Nomination" tone="neutral" /> : null}
        </View>
        {amount !== null && (
          <View style={styles.amountBlock}>
            <Text style={styles.amount}>{formatCurrency(amount)}</Text>
            {variant === "list" && <Caption>{amountLabel}</Caption>}
          </View>
        )}
      </View>

      <Subheading numberOfLines={2}>{decodeHtml(cycle?.cycle_name) || "Grant Application"}</Subheading>

      <Caption>
        Deadline: {cycle?.end_date ? formatDateLong(cycle.end_date) : "—"}
        {variant === "list" && (grant.submitted_at || grant.created_at)
          ? ` · ${grant.submitted_at ? "Submitted" : "Created"} ${formatDateLong(grant.submitted_at ?? grant.created_at)}`
          : ""}
      </Caption>

      {variant === "list" && grant.who_are_you ? (
        <Caption numberOfLines={2} style={styles.preview}>
          {grant.who_are_you}
        </Caption>
      ) : null}

      {variant === "list" && needsBank && (
        <Text style={styles.prompt}>Approved! Connect your bank account to receive your funds.</Text>
      )}
      {variant === "list" && grant.status === "payment_sent" && (
        <Text style={styles.prompt}>Payment sent! Check your bank account.</Text>
      )}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  amountBlock: { alignItems: "flex-end" },
  amount: { fontFamily: fonts.uiBlack, fontSize: 18, color: colors.aubergine },
  preview: { color: theme.textMuted },
  prompt: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.aubergine, marginTop: 2 },
});

import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Heading, Label, Subheading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { env } from "@/lib/env";
import { decodeHtml, formatCurrency, formatDateLong, formatDateTime } from "@/lib/format";
import { useGrant, useGrantDocuments } from "@/lib/queries/grants";
import { useAuthStore } from "@/stores/auth";
import { GRANT_STATUS_LABELS, GRANT_STATUS_TONES } from "@/types/grants";

/**
 * Web equivalent:
 *   - app/grants/view/[id]/page.tsx
 *   - GET /api/stripe/connect/status, POST /api/grants/document-url (Bearer pending → web hand-off)
 * Build phase: 3
 */
export default function GrantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const grant = useGrant(id);
  const documents = useGrantDocuments(id);

  if (grant.isLoading) return <LoadingScreen />;
  if (grant.isError) return <ErrorScreen message={(grant.error as Error).message} onRetry={() => grant.refetch()} />;
  if (!grant.data) {
    return <ErrorScreen message="We couldn't find that application." onRetry={() => router.replace("/(tabs)/grants/my-applications")} />;
  }

  const g = grant.data;
  const cycle = g.grant_cycles;
  const label = GRANT_STATUS_LABELS[g.status] ?? g.status;
  const tone = GRANT_STATUS_TONES[g.status] ?? "neutral";
  const bankConnected = !!g.stripe_connect_account_id || profile?.stripe_onboarding_completed === true;
  const webGrantUrl = `${env.siteUrl}/grants/view/${g.id}`;

  return (
    <>
      <Stack.Screen options={{ title: decodeHtml(cycle?.cycle_name) || "Application" }} />
      <Screen>
        <View style={styles.badges}>
          <Badge label={label} tone={tone} />
          {g.is_nominating ? <Badge label="Nomination" tone="neutral" /> : null}
        </View>
        <Heading>{decodeHtml(cycle?.cycle_name) || "Grant Application"}</Heading>
        {g.submitted_at && <Caption>Submitted {formatDateLong(g.submitted_at)}</Caption>}

        {g.amount_approved ? (
          <Card surface="citrine" bordered={false} style={styles.approvedAmount}>
            <Text style={styles.approvedValue}>{formatCurrency(g.amount_approved)}</Text>
            <Label>Approved Amount</Label>
          </Card>
        ) : null}

        {/* Status-specific action sections */}
        {g.status === "approved" && !bankConnected && (
          <Card surface="citrine" bordered={false} style={styles.action}>
            <Subheading>Your Grant Has Been Approved!</Subheading>
            <Body>
              To receive your funds, please connect your bank account. This is a secure process handled by Stripe — NFW never sees your banking details.
            </Body>
            <Caption tone="default">
              IMPORTANT: If you don&apos;t have a website, please input nationalfundforwomen.org when prompted.
            </Caption>
            <Button label="Connect Bank Account" variant="tertiary" onPress={() => Linking.openURL(webGrantUrl)} />
            <Caption>Opens nationalfundforwomen.org to complete Stripe onboarding.</Caption>
          </Card>
        )}
        {g.status === "approved" && bankConnected && (
          <Card style={[styles.action, styles.successCard]}>
            <View style={styles.inlineRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              <Label>Bank Account Connected</Label>
            </View>
            <Caption>Your payment will be sent to your connected account.</Caption>
          </Card>
        )}
        {g.status === "payment_sent" && (
          <Card style={[styles.action, styles.successCard]}>
            <Subheading>Payment Sent!</Subheading>
            <Body>
              Your grant payment{g.amount_approved ? ` of ${formatCurrency(g.amount_approved)}` : ""} has been sent to your bank account. Please allow 1-3 business days for it to appear.
            </Body>
          </Card>
        )}
        {g.status === "not_approved" && (
          <Card style={[styles.action, styles.dangerCard]}>
            <Subheading>Application Not Approved</Subheading>
            <Body>
              Unfortunately, your application was not approved at this time. You may apply again in a future grant cycle.
            </Body>
          </Card>
        )}

        {/* Cycle box */}
        {cycle && (
          <Card surface="dove" bordered={false} style={styles.block}>
            <Label tone="muted">Grant Cycle</Label>
            <Body>
              {formatDateLong(cycle.start_date)} — {formatDateLong(cycle.end_date)}
            </Body>
            <Caption>
              {formatCurrency(cycle.amount_per_grant)} per grant · {cycle.grants_available} available
            </Caption>
          </Card>
        )}

        {/* Answers */}
        {g.is_nominating && (
          <Answer label="Nominee Information">
            <Body>Name: {g.nominee_name ?? "—"}</Body>
            <Body>Email: {g.nominee_email ?? "—"}</Body>
          </Answer>
        )}
        <Answer label={g.is_nominating ? "About the Nominee" : "Who are you?"}>
          <Body>{g.who_are_you}</Body>
        </Answer>
        <Answer label="Biggest Challenge">
          <Body>{g.biggest_challenge}</Body>
        </Answer>
        <Answer label={g.is_nominating ? "How They Would Use the Funds" : "How You Would Use the Funds"}>
          <Body>{g.fund_usage}</Body>
        </Answer>

        {/* Documents */}
        {(documents.data?.length ?? 0) > 0 && (
          <Card style={styles.block}>
            <Label>Supporting Documents</Label>
            {documents.data!.map((d) => (
              <View key={d.id} style={styles.docRow}>
                <Ionicons name="document-attach-outline" size={18} color={colors.aubergine} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {d.file_name}
                  </Text>
                  {d.file_size ? <Caption>{Math.round(d.file_size / 1024)} KB</Caption> : null}
                </View>
              </View>
            ))}
            <Caption>Documents can be viewed on nationalfundforwomen.org.</Caption>
          </Card>
        )}

        {/* Timeline */}
        <Card style={styles.block}>
          <Label>Application Timeline</Label>
          {g.submitted_at && <TimelineItem color="#1D4ED8" title="Submitted for Review" when={g.submitted_at} />}
          {g.funded_at && <TimelineItem color="#7C3AED" title="Payment Sent" when={g.funded_at} />}
          {!g.submitted_at && !g.funded_at && <Caption>No timeline events yet.</Caption>}
        </Card>

        <Button label="Back to My Applications" variant="ghost" onPress={() => router.push("/(tabs)/grants/my-applications")} />
      </Screen>
    </>
  );
}

function Answer({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.answer}>
      <Label tone="muted">{label}</Label>
      {children}
    </View>
  );
}

function TimelineItem({ color, title, when }: { color: string; title: string; when: string }) {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Body>{title}</Body>
        <Caption>{formatDateTime(when)}</Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: 6, marginBottom: 10 },
  approvedAmount: { marginTop: 16, gap: 2 },
  approvedValue: { fontFamily: fonts.serifSemiBold, fontSize: 30, color: colors.blackberry },
  action: { marginTop: 16, gap: 10 },
  successCard: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  dangerCard: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  block: { marginTop: 16, gap: 8 },
  answer: { marginTop: 20, gap: 6 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border },
  docName: { fontFamily: fonts.uiMedium, fontSize: 14, color: theme.text },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
});

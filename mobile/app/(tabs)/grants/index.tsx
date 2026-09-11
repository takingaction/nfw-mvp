import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { GrantCycleCard } from "@/components/grants/GrantCycleCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Caption, Eyebrow, Heading, Label } from "@/components/ui/Typography";
import { env } from "@/lib/env";
import { useMyGrants, useOpenGrantCycles } from "@/lib/queries/grants";
import { useAuthStore } from "@/stores/auth";
import { canAccessMemberBenefits } from "@/types/profile";

/**
 * Web equivalent:
 *   - app/grants/apply/page.tsx (cycle list + eligibility copy)
 *   - grant_cycles (status=open, is_testing_only=false unless admin)
 * Build phase: 3
 *
 * Web /grants redirects to a CMS marketing page; on mobile this tab IS the grants home.
 */
export default function GrantsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const cycles = useOpenGrantCycles();
  const grants = useMyGrants();
  const [refreshing, setRefreshing] = useState(false);

  const eligible = canAccessMemberBenefits(profile);
  const applicationCount = grants.data?.length ?? 0;

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["grant-cycles"] });
    await queryClient.invalidateQueries({ queryKey: ["grants"] });
    setRefreshing(false);
  }

  if (cycles.isLoading && !cycles.data) return <LoadingScreen />;
  if (cycles.isError) return <ErrorScreen message={(cycles.error as Error).message} onRetry={() => cycles.refetch()} />;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.intro}>
        <Eyebrow>Microgrants</Eyebrow>
        <Heading>Apply for a Microgrant</Heading>
        <Body tone="muted">
          NFW microgrants help with real-life needs like childcare, medical costs, car repairs, and more.
        </Body>
      </View>

      <Card style={styles.myApps}>
        <View style={styles.myAppsRow}>
          <View style={{ flex: 1 }}>
            <Label>My Applications</Label>
            <Caption>{applicationCount === 0 ? "You haven't applied yet" : `${applicationCount} application${applicationCount === 1 ? "" : "s"}`}</Caption>
          </View>
          <Button label="View" variant="ghost" size="sm" onPress={() => router.push("/(tabs)/grants/my-applications")} />
        </View>
      </Card>

      {!eligible && (
        <Card surface="citrine" bordered={false} style={styles.notice}>
          <Label>Membership required</Label>
          <Caption tone="default">
            {profile?.membership_level === "waitlist"
              ? "You're on the free membership waitlist. Upgrade to apply for microgrants now."
              : "Your free membership is pending approval. Upgrade to apply for microgrants now."}
          </Caption>
          <Button label="Upgrade" variant="primary" size="sm" onPress={() => Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`)} style={styles.noticeButton} />
        </Card>
      )}

      <Card surface="wisteria" bordered={false} style={styles.reminder}>
        <Label tone="inverse">Quick reminder before you apply:</Label>
        {REMINDERS.map((r) => (
          <Body key={r} tone="inverse" style={styles.bullet}>
            • {r}
          </Body>
        ))}
      </Card>

      <Card surface="aubergine" bordered={false}>
        <Body tone="inverse" style={styles.eligibility}>
          To keep microgrants fair and accessible to as many members as possible, members are not eligible to receive a grant two months in a row. For example, if you received a grant in August, you&apos;ll be eligible to receive another grant beginning in October. In the meantime, we encourage you to explore our other programs!
        </Body>
      </Card>

      <Heading style={styles.listHeading}>Which grant are you applying for?</Heading>

      {(cycles.data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="No Grant Cycles Available"
            message="There are currently no open grant cycles. Please check back later or contact us for more information."
            actionLabel="Contact Us"
            actionVariant="ghost"
            onAction={() => router.push("/contact")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {cycles.data!.map((c) => (
            <GrantCycleCard
              key={c.id}
              cycle={c}
              onPress={() => router.push({ pathname: "/(tabs)/grants/apply", params: { cycleId: c.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const REMINDERS = [
  "Applicants must be 18 or older and a U.S. citizen or permanent resident.",
  "Applicants may apply for up to 3 grants, but can only be awarded 1 grant per cycle.",
  "Applications cannot be edited after submission.",
  "Some grants require additional documentation, please read the grant descriptions carefully.",
  "There are no nominations this grant cycle. Keep an eye out for future nomination-only grants!",
];

const styles = StyleSheet.create({
  intro: { gap: 6, marginBottom: 20 },
  myApps: { marginBottom: 16 },
  myAppsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  notice: { gap: 6, marginBottom: 16 },
  noticeButton: { alignSelf: "flex-start", marginTop: 4 },
  reminder: { gap: 6, marginBottom: 12 },
  bullet: { fontSize: 14, lineHeight: 21 },
  eligibility: { fontSize: 14, lineHeight: 21 },
  listHeading: { marginTop: 24, marginBottom: 12, fontSize: 22 },
  list: { gap: 14 },
});

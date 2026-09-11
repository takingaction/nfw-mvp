import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GrantApplicationCard } from "@/components/grants/GrantApplicationCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorScreen, LoadingScreen, Screen } from "@/components/ui/Screen";
import { Body, Heading } from "@/components/ui/Typography";
import { colors, theme } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useMyGrants } from "@/lib/queries/grants";

/**
 * Web equivalent: app/grants/my-applications/page.tsx
 * Build phase: 3
 */
export default function MyApplicationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const grants = useMyGrants();
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(() => {
    const list = grants.data ?? [];
    return {
      submitted: list.filter((g) => g.status === "submitted").length,
      approved: list.filter((g) => g.status === "approved").length,
      not_approved: list.filter((g) => g.status === "not_approved").length,
      payment_sent: list.filter((g) => g.status === "payment_sent").length,
    };
  }, [grants.data]);

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["grants"] });
    setRefreshing(false);
  }

  if (grants.isLoading && !grants.data) return <LoadingScreen />;
  if (grants.isError) return <ErrorScreen message={(grants.error as Error).message} onRetry={() => grants.refetch()} />;

  const list = grants.data ?? [];

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Heading>My Grant Applications</Heading>
          <Body tone="muted">Track your microgrant applications and their status</Body>
        </View>
      </View>
      <Button label="+ New Application" variant="accent" size="sm" onPress={() => router.push("/(tabs)/grants/apply")} style={styles.newButton} />

      <View style={styles.stats}>
        <Stat label="Submitted" value={counts.submitted} color="#1D4ED8" />
        <Stat label="Approved" value={counts.approved} color="#16A34A" />
        <Stat label="Not Approved" value={counts.not_approved} color="#EF4444" />
        <Stat label="Pmt Sent" value={counts.payment_sent} color="#7C3AED" />
      </View>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon="document-text-outline"
            title="No Applications Yet"
            message="You haven't submitted any grant applications. Start your first application to get support for your needs."
            actionLabel="Apply for a Grant"
            onAction={() => router.push("/(tabs)/grants/apply")}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {list.map((g) => (
            <GrantApplicationCard key={g.id} grant={g} onPress={() => router.push({ pathname: "/(tabs)/grants/[id]", params: { id: g.id } })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  newButton: { alignSelf: "flex-start", marginBottom: 20 },
  stats: { flexDirection: "row", gap: 8, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: theme.border, paddingVertical: 12, alignItems: "center", gap: 2 },
  statValue: { fontFamily: fonts.uiBlack, fontSize: 22 },
  statLabel: { fontFamily: fonts.ui, fontSize: 10, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center" },
  list: { gap: 12 },
});
